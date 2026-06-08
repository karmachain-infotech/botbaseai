import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getStripeClient, CREDIT_LIMITS, getPlanFromPriceId } from "../stripe";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { AuthError, DatabaseError, ExternalServiceError, handleServerError, NotFoundError } from "../errors";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      priceId: z.string(),
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
        .select("stripe_customer_id, email, name")
        .eq("id", user.id)
        .single();

      if (dbError) throw new DatabaseError(dbError.message);

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

      let session;
      try {
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [{ price: data.priceId, quantity: 1 }],
          mode: "subscription",
          success_url: data.successUrl,
          cancel_url: data.cancelUrl,
          metadata: { userId: user.id },
        });
      } catch (stripeError) {
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
        throw new ExternalServiceError("Stripe", "Failed to create portal session. Please try again.");
      }

      return { url: session.url };
    } catch (error) {
      throw handleServerError(error, "createPortalSession");
    }
  });

export const handleWebhook = createServerFn({ method: "POST" })
  .handler(async () => {
    return { handled: true, message: "Webhook endpoint should be configured as an API route" };
  });

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

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as { customer: string; items: { data: { price: { id: string } }[] } };
        const priceId = subscription.items.data[0].price.id;
        const plan = getPlanFromPriceId(priceId);
        const credits = CREDIT_LIMITS[plan] ?? 50;

        const { error: updateErr } = await admin
          .from("users")
          .update({
            plan,
            message_credits_limit: credits,
            message_credits_used: 0,
            stripe_subscription_id: subscription as unknown as string,
          })
          .eq("stripe_customer_id", subscription.customer);

        if (updateErr) {
          console.error("[processStripeWebhook] subscription update failed:", updateErr.message);
          throw new DatabaseError(updateErr.message);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as { customer: string };
        const { error: deleteErr } = await admin
          .from("users")
          .update({
            plan: "free",
            message_credits_limit: CREDIT_LIMITS.free,
            message_credits_used: 0,
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", deletedSub.customer);

        if (deleteErr) {
          console.error("[processStripeWebhook] subscription delete failed:", deleteErr.message);
          throw new DatabaseError(deleteErr.message);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as { customer: string; subscription: string };
        const { error: invoiceErr } = await admin
          .from("users")
          .update({ message_credits_used: 0 })
          .eq("stripe_customer_id", invoice.customer);

        if (invoiceErr) {
          console.error("[processStripeWebhook] invoice update failed:", invoiceErr.message);
          throw new DatabaseError(invoiceErr.message);
        }
        break;
      }
    }

    return { received: true };
  } catch (error) {
    throw handleServerError(error, "processStripeWebhook");
  }
}
