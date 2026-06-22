import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getStripeClient, CREDIT_LIMITS, getPlanFromPriceId, getOrCreatePrice, PLAN_AMOUNTS } from "../stripe";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { AuthError, DatabaseError, ExternalServiceError, ValidationError, handleServerError, NotFoundError } from "../errors";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceId: z.string(),
      plan: z.string().optional(),
      interval: z.enum(["monthly", "yearly"]).optional(),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const stripe = getStripeClient();

      const { data: dbUser, error: dbError } = await admin
        .from("users")
        .select("stripe_customer_id, stripe_subscription_id, email, name, plan")
        .eq("id", user.id)
        .single();

      if (dbError) throw new DatabaseError(dbError.message);

      // If user already has an active Stripe subscription, redirect to portal instead
      if (dbUser?.stripe_subscription_id && dbUser?.plan !== "free") {
        try {
          const existingSub = await stripe.subscriptions.retrieve(dbUser.stripe_subscription_id);
          if (existingSub.status === "active" || existingSub.status === "trialing") {
            const portal = await stripe.billingPortal.sessions.create({
              customer: dbUser.stripe_customer_id!,
              return_url: data.successUrl,
            });
            return { url: portal.url };
          }
        } catch {
          // Fall through to checkout if subscription lookup fails
        }
      }

      let customerId = dbUser?.stripe_customer_id;

      if (!customerId) {
        try {
          const customer = await stripe.customers.create({
            email: dbUser?.email ?? user.email,
            name: dbUser?.name ?? undefined,
            metadata: { userId: user.id },
          });
          customerId = customer.id;

          const { error: updateErr } = await admin
            .from("users")
            .update({ stripe_customer_id: customerId })
            .eq("id", user.id);
          if (updateErr) console.error("[createCheckoutSession] Failed to save customer ID:", updateErr.message);
        } catch (stripeError) {
          throw new ExternalServiceError("Stripe", "Failed to create customer. Please try again.");
        }
      }

      // Resolve price ID — create dynamically if the env var is a literal number
      let resolvedPriceId = data.priceId;
      if (!resolvedPriceId.startsWith("price_") && data.plan && data.interval) {
        const amounts = PLAN_AMOUNTS[data.plan.toLowerCase()];
        if (!amounts) {
          throw new ExternalServiceError("Stripe", `Unknown plan: ${data.plan}`);
        }
        const amount = data.interval === "monthly" ? amounts.monthly : amounts.yearly;
        const stripeInterval = data.interval === "monthly" ? "month" : "year";
        resolvedPriceId = await getOrCreatePrice(stripe, amount, stripeInterval, data.plan);
      }

      let session;
      try {
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [{ price: resolvedPriceId, quantity: 1 }],
          mode: "subscription",
          success_url: data.successUrl,
          cancel_url: data.cancelUrl,
          metadata: { userId: user.id },
        });
      } catch (stripeError) {
        console.error("[createCheckoutSession] Stripe error:", stripeError);
        throw new ExternalServiceError("Stripe", "Failed to create checkout session. Please try again.");
      }

      return { url: session.url };
    } catch (error) {
      throw handleServerError(error, "createCheckoutSession");
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const stripe = getStripeClient();

      const { data: dbUser, error: dbError } = await admin
        .from("users")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (dbError) throw new DatabaseError(dbError.message);
      if (!dbUser?.stripe_customer_id) throw new NotFoundError("Stripe customer");

      let session;
      try {
        session = await stripe.billingPortal.sessions.create({
          customer: dbUser.stripe_customer_id,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
        });
      } catch (stripeError) {
        console.error("[createPortalSession] Stripe error:", stripeError);
        throw new ExternalServiceError("Stripe", "Failed to create portal session. Please try again.");
      }

      return { url: session.url };
    } catch (error) {
      throw handleServerError(error, "createPortalSession");
    }
  });

export const syncSubscription = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const stripe = getStripeClient();

      const { data: dbUser, error: dbError } = await admin
        .from("users")
        .select("stripe_customer_id, plan")
        .eq("id", user.id)
        .single();

      if (dbError) throw new DatabaseError(dbError.message);
      if (!dbUser?.stripe_customer_id) return { synced: false };

      const subscriptions = await stripe.subscriptions.list({
        customer: dbUser.stripe_customer_id,
        limit: 5,
      });

      const activeSub = subscriptions.data.find(
        (s) => s.status === "active" || s.status === "trialing" || s.status === "past_due",
      );

      // If no active subscription, or it's cancelled at period end — downgrade immediately
      if (!activeSub || activeSub.cancel_at_period_end) {
        if (dbUser.plan !== "free") {
          const { error: downErr } = await admin
            .from("users")
            .update({
              plan: "free",
              message_credits_limit: CREDIT_LIMITS.free,
              message_credits_used: 0,
              stripe_subscription_id: null,
            })
            .eq("id", user.id);
          if (downErr) throw new DatabaseError(downErr.message);
          return { synced: true, plan: "free" };
        }
        return { synced: false };
      }

      const priceId = activeSub.items.data[0]?.price.id;
      if (!priceId) return { synced: false };

      const plan = getPlanFromPriceId(priceId);
      if (plan === "free") return { synced: false };

      const credits = CREDIT_LIMITS[plan] ?? CREDIT_LIMITS.free;

      const { error: updateErr } = await admin
        .from("users")
        .update({
          plan,
          message_credits_limit: credits,
          stripe_subscription_id: activeSub.id,
        })
        .eq("id", user.id);

      if (updateErr) throw new DatabaseError(updateErr.message);
      return { synced: true, plan };
    } catch (error) {
      throw handleServerError(error, "syncSubscription");
    }
  });

export const getPriceIds = createServerFn({ method: "GET" })
  .handler(async () => {
    return {
      hobby: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOBBY_MONTHLY || "",
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_HOBBY_YEARLY || "",
      },
      standard: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY || "",
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY || "",
      },
      pro: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "",
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || "",
      },
    };
  });

async function resetToFreePlan(admin: ReturnType<typeof getAdminClient>, customerId: string) {
  const { error } = await admin
    .from("users")
    .update({
      plan: "free",
      message_credits_limit: CREDIT_LIMITS.free,
      message_credits_used: 0,
      stripe_subscription_id: null,
    })
    .eq("stripe_customer_id", customerId);
  if (error) {
    console.error("[processStripeWebhook] reset to free failed:", error.message);
    throw new DatabaseError(error.message);
  }
}

export async function processStripeWebhook(
  signature: string,
  body: string,
): Promise<{ received: boolean }> {
  try {
    const stripe = getStripeClient();
    const admin = getAdminClient();

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (webhookError) {
      throw new ValidationError("Invalid webhook signature");
    }

    const eventType = event.type;
    switch (eventType) {
      case "customer.subscription.created": {
        const subscription = event.data.object as {
          id: string;
          customer: string;
          items: { data: { price: { id: string } }[] };
        };
        const priceId = subscription.items.data[0].price.id;
        const plan = getPlanFromPriceId(priceId);
        if (plan === "free") {
          throw new ValidationError(
            `Unknown price ID: ${priceId}. Check STRIPE_PRICE_* env vars match your Stripe products.`,
          );
        }
        const credits = CREDIT_LIMITS[plan] ?? CREDIT_LIMITS.free;

        const { error: updateErr } = await admin
          .from("users")
          .update({
            plan,
            message_credits_limit: credits,
            message_credits_used: 0,
            stripe_subscription_id: subscription.id,
          })
          .eq("stripe_customer_id", subscription.customer);

        if (updateErr) {
          console.error("[processStripeWebhook] subscription created failed:", updateErr.message);
          throw new DatabaseError(updateErr.message);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          id: string;
          customer: string;
          items: { data: { price: { id: string } }[] };
          cancel_at_period_end?: boolean;
          status: string;
        };

        // If the subscription is no longer active, or cancelled at period end — downgrade immediately
        if (
          subscription.status !== "active" && subscription.status !== "trialing" ||
          subscription.cancel_at_period_end
        ) {
          if (
            subscription.status === "canceled" ||
            subscription.status === "incomplete_expired" ||
            subscription.cancel_at_period_end
          ) {
            await resetToFreePlan(admin, subscription.customer);
          }
          break;
        }

        const priceId = subscription.items.data[0].price.id;
        const plan = getPlanFromPriceId(priceId);
        if (plan === "free") {
          throw new ValidationError(
            `Unknown price ID: ${priceId}. Check STRIPE_PRICE_* env vars match your Stripe products.`,
          );
        }
        const credits = CREDIT_LIMITS[plan] ?? CREDIT_LIMITS.free;

        // Don't reset message_credits_used mid-cycle — only invoice.paid handles that
        const { error: updateErr } = await admin
          .from("users")
          .update({
            plan,
            message_credits_limit: credits,
            stripe_subscription_id: subscription.id,
          })
          .eq("stripe_customer_id", subscription.customer);

        if (updateErr) {
          console.error("[processStripeWebhook] subscription updated failed:", updateErr.message);
          throw new DatabaseError(updateErr.message);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as { customer: string };
        await resetToFreePlan(admin, deletedSub.customer);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as { customer: string };
        const { error: invoiceErr } = await admin
          .from("users")
          .update({ message_credits_used: 0 })
          .eq("stripe_customer_id", invoice.customer);

        if (invoiceErr) {
          console.error("[processStripeWebhook] invoice paid failed:", invoiceErr.message);
          throw new DatabaseError(invoiceErr.message);
        }
        break;
      }

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object as { customer: string; attempt_count?: number };
        console.error(
          `[processStripeWebhook] Payment failed for customer ${failedInvoice.customer}` +
            (failedInvoice.attempt_count ? ` (attempt ${failedInvoice.attempt_count})` : ""),
        );
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as { customer: string };
        console.error(`[processStripeWebhook] Charge refunded for customer ${charge.customer}`);
        await resetToFreePlan(admin, charge.customer);
        break;
      }
    }

    if ((eventType as string) === "payment_intent.refunded") {
      const pi = event.data.object as { customer: string };
      console.error(`[processStripeWebhook] Payment refunded for customer ${pi.customer}`);
      await resetToFreePlan(admin, pi.customer);
    }

    return { received: true };
  } catch (error) {
    throw handleServerError(error, "processStripeWebhook");
  }
}
