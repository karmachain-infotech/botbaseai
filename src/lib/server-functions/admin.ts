import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { getStripeClient } from "../stripe";
import { AuthError, DatabaseError, NotFoundError, ValidationError, handleServerError } from "../errors";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new AuthError();

  const admin = getAdminClient();
  const { data: dbUser, error: dbError } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (dbError) throw new DatabaseError(dbError.message);
  if (!dbUser?.is_admin) throw new AuthError("You do not have admin privileges");

  return { admin, adminId: user.id };
}

async function logAdminAction(opts: {
  adminId: string;
  action: string;
  targetUserId?: string;
  targetResource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = getAdminClient();
    await admin.from("admin_logs").insert({
      admin_id: opts.adminId,
      action: opts.action,
      target_user_id: opts.targetUserId || null,
      target_resource: opts.targetResource || null,
      resource_id: opts.resourceId || null,
      metadata: opts.metadata || {},
    });
  } catch (err) {
    console.error("[adminLog] Failed to log action:", err);
  }
}

export const getAdminDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { admin } = await requireAdmin();

      const now = new Date();
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      // Total users
      const { count: totalUsers } = await admin
        .from("users")
        .select("*", { count: "exact", head: true });
      const { count: usersLastMonth } = await admin
        .from("users")
        .select("*", { count: "exact", head: true })
        .lt("created_at", firstOfThisMonth);
      const userGrowthPercent = (usersLastMonth ?? 1) > 0
        ? Math.round(((totalUsers! - usersLastMonth!) / usersLastMonth!) * 100)
        : 0;

      // Total chatbots
      const { count: totalChatbots } = await admin
        .from("chatbots")
        .select("*", { count: "exact", head: true });

      // Total messages
      const { count: totalMessages } = await admin
        .from("messages")
        .select("*", { count: "exact", head: true });

      // Active subscriptions (non-free plans)
      const { count: activeSubscriptions } = await admin
        .from("users")
        .select("*", { count: "exact", head: true })
        .not("plan", "eq", "free");

      // Churned this month (were previously on paid, now free, changed this month)
      const { count: churnedCount } = await admin
        .from("admin_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "user_plan_changed_to_free")
        .gte("created_at", firstOfThisMonth);

      // User signups over time (last 30 days)
      const { data: signups } = await admin
        .from("users")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      const signupsByDate: Record<string, number> = {};
      (signups ?? []).forEach((s: { created_at: string }) => {
        const d = s.created_at.slice(0, 10);
        signupsByDate[d] = (signupsByDate[d] ?? 0) + 1;
      });
      const userSignupsOverTime = Object.entries(signupsByDate).map(([date, count]) => ({ date, count }));

      // Messages per day (last 30 days)
      const { data: msgs } = await admin
        .from("messages")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      const msgsByDate: Record<string, number> = {};
      (msgs ?? []).forEach((m: { created_at: string }) => {
        const d = m.created_at.slice(0, 10);
        msgsByDate[d] = (msgsByDate[d] ?? 0) + 1;
      });
      const messagesPerDay = Object.entries(msgsByDate).map(([date, count]) => ({ date, count }));

      // Revenue from Stripe (last 6 months)
      let revenueOverTime: { date: string; amount: number }[] = [];
      let monthlyRevenue = 0;
      try {
        const stripe = getStripeClient();
        const invoices = await stripe.invoices.list({
          status: "paid",
          created: { gte: Math.floor(new Date(sixMonthsAgo).getTime() / 1000) },
          limit: 100,
        });

        const revenueByMonth: Record<string, number> = {};
        for (const inv of invoices.data) {
          const d = new Date(inv.created * 1000).toISOString().slice(0, 7);
          revenueByMonth[d] = (revenueByMonth[d] ?? 0) + (inv.amount_paid / 100);
        }
        revenueOverTime = Object.entries(revenueByMonth).map(([date, amount]) => ({ date, amount }));

        // MRR: sum of active subscriptions
        const activeSubs = await stripe.subscriptions.list({
          status: "active",
          limit: 100,
        });
        for (const sub of activeSubs.data) {
          for (const item of sub.items.data) {
            if (item.price.unit_amount) {
              monthlyRevenue += (item.price.unit_amount / 100);
            }
          }
        }
      } catch (err) {
        console.error("[adminDashboard] Stripe revenue fetch failed:", err);
      }

      // Plan distribution
      const { data: planData } = await admin
        .from("users")
        .select("plan");
      const planDist: Record<string, number> = {};
      (planData ?? []).forEach((u: { plan: string }) => {
        planDist[u.plan] = (planDist[u.plan] ?? 0) + 1;
      });
      const planDistribution = Object.entries(planDist).map(([plan, count]) => ({ plan, count }));

      // Recent signups (last 10)
      const { data: recentSignups } = await admin
        .from("users")
        .select("id, email, name, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      // Recent chatbots (last 10)
      const { data: recentBots } = await admin
        .from("chatbots")
        .select("id, name, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      let recentChatbots: { id: string; name: string; user_email: string; created_at: string }[] = [];
      if (recentBots && recentBots.length > 0) {
        const userIds = [...new Set(recentBots.map(b => b.user_id))];
        const { data: botOwners } = await admin
          .from("users")
          .select("id, email")
          .in("id", userIds);
        const ownerMap = new Map((botOwners ?? []).map((u: { id: string; email: string }) => [u.id, u.email]));
        recentChatbots = recentBots.map(b => ({
          id: b.id,
          name: b.name,
          user_email: ownerMap.get(b.user_id) || "unknown",
          created_at: b.created_at,
        }));
      }

      // Recent subscription changes (last 10)
      const { data: recentLogs } = await admin
        .from("admin_logs")
        .select("id, action, target_user_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      let recentSubscriptionChanges: { id: string; user_email: string; plan: string; action: string; created_at: string }[] = [];
      if (recentLogs && recentLogs.length > 0) {
        const targetIds = [...new Set(recentLogs.filter(l => l.target_user_id).map(l => l.target_user_id))];
        const { data: logUsers } = await admin
          .from("users")
          .select("id, email")
          .in("id", targetIds);
        const userMap = new Map((logUsers ?? []).map((u: { id: string; email: string }) => [u.id, u.email]));
        recentSubscriptionChanges = recentLogs.map(l => ({
          id: l.id,
          user_email: userMap.get(l.target_user_id || "") || "unknown",
          plan: (l.metadata as Record<string, string>)?.plan || "unknown",
          action: l.action,
          created_at: l.created_at,
        }));
      }

      return {
        totalUsers: totalUsers ?? 0,
        userGrowthPercent,
        totalChatbots: totalChatbots ?? 0,
        totalMessages: totalMessages ?? 0,
        monthlyRevenue,
        activeSubscriptions: activeSubscriptions ?? 0,
        churnedUsersThisMonth: churnedCount ?? 0,
        userSignupsOverTime,
        messagesPerDay,
        revenueOverTime,
        planDistribution,
        recentSignups: recentSignups ?? [],
        recentChatbots,
        recentSubscriptionChanges,
      };
    } catch (error) {
      throw handleServerError(error, "getAdminDashboard");
    }
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      plan: z.string().optional(),
      status: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(25),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { admin } = await requireAdmin();

      let query = admin
        .from("users")
        .select("id, email, name, avatar_url, plan, message_credits_used, message_credits_limit, stripe_customer_id, stripe_subscription_id, is_admin, created_at", { count: "exact" });

      if (data.search) {
        query = query.or(`email.ilike.%${data.search}%,name.ilike.%${data.search}%`);
      }

      if (data.plan && data.plan !== "all") {
        query = query.eq("plan", data.plan);
      }

      const sortColumn = data.sortBy || "created_at";
      const sortOrder = data.sortOrder || "desc";
      query = query.order(sortColumn, { ascending: sortOrder === "asc" });

      const from = (data.page - 1) * data.pageSize;
      const to = from + data.pageSize - 1;
      query = query.range(from, to);

      const { data: users, count, error } = await query;
      if (error) throw new DatabaseError(error.message);

      // Get chatbot counts for each user
      const userIds = users.map(u => u.id);
      const { data: chatbotCounts } = await admin
        .from("chatbots")
        .select("user_id")
        .in("user_id", userIds);

      const chatbotCountMap = new Map<string, number>();
      (chatbotCounts ?? []).forEach((c: { user_id: string }) => {
        chatbotCountMap.set(c.user_id, (chatbotCountMap.get(c.user_id) ?? 0) + 1);
      });

      const usersWithCounts = users.map(u => ({
        ...u,
        chatbots_count: chatbotCountMap.get(u.id) ?? 0,
      }));

      // Get messages count for this month per user
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: userMsgCounts } = await admin
        .from("messages")
        .select("conversation_id")
        .gte("created_at", firstOfMonth);

      const { data: userConvs } = await admin
        .from("conversations")
        .select("id, chatbot_id")
        .in("chatbot_id", (await admin.from("chatbots").select("id").in("user_id", userIds)).data?.map(c => c.id) || []);

      const convToChatbot = new Map((userConvs ?? []).map((c: { id: string; chatbot_id: string }) => [c.id, c.chatbot_id]));
      const { data: chatbots } = await admin
        .from("chatbots")
        .select("id, user_id")
        .in("user_id", userIds);
      const chatbotToUser = new Map((chatbots ?? []).map((c: { id: string; user_id: string }) => [c.id, c.user_id]));

      const userMsgCount: Record<string, number> = {};
      (userMsgCounts ?? []).forEach((m: { conversation_id: string }) => {
        const convId = m.conversation_id;
        const chatbotId = convToChatbot.get(convId);
        if (chatbotId) {
          const uid = chatbotToUser.get(chatbotId);
          if (uid) {
            userMsgCount[uid] = (userMsgCount[uid] ?? 0) + 1;
          }
        }
      });

      const finalUsers = usersWithCounts.map(u => ({
        ...u,
        messages_this_month: userMsgCount[u.id] ?? 0,
      }));

      return {
        users: finalUsers,
        total: count ?? 0,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: Math.ceil((count ?? 0) / data.pageSize),
      };
    } catch (error) {
      throw handleServerError(error, "adminListUsers");
    }
  });

export const adminGetUser = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { admin } = await requireAdmin();

      const { data: user, error } = await admin
        .from("users")
        .select("*")
        .eq("id", data.userId)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!user) throw new NotFoundError("User");

      // Get chatbots
      const { data: chatbots } = await admin
        .from("chatbots")
        .select("*")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false });

      // Get subscription info from Stripe
      let stripeSubscription: Record<string, unknown> | null = null;
      if (user.stripe_subscription_id) {
        try {
          const stripe = getStripeClient();
          const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
          stripeSubscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            items: sub.items.data.map(item => ({
              price: item.price.id,
              amount: (item.price.unit_amount ?? 0) / 100,
              interval: item.price.recurring?.interval,
            })),
          };
        } catch { /* Stripe unavailable */ }
      }

      // Get message usage this month
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: userConvs } = await admin
        .from("conversations")
        .select("id")
        .in("chatbot_id", (chatbots ?? []).map(c => c.id));
      const convIds = (userConvs ?? []).map(c => c.id);

      let messagesThisMonth = 0;
      if (convIds.length > 0) {
        const { count } = await admin
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .gte("created_at", firstOfMonth);
        messagesThisMonth = count ?? 0;
      }

      // Activity log
      const { data: activityLog } = await admin
        .from("admin_logs")
        .select("*")
        .eq("target_user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(50);

      return {
        user,
        chatbots: chatbots ?? [],
        stripeSubscription,
        messagesThisMonth,
        activityLog: activityLog ?? [],
      };
    } catch (error) {
      throw handleServerError(error, "adminGetUser");
    }
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      plan: z.string().optional(),
      message_credits_limit: z.number().optional(),
      message_credits_used: z.number().optional(),
      is_admin: z.boolean().optional(),
      name: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { admin, adminId } = await requireAdmin();

      const updates: Record<string, unknown> = {};
      if (data.plan !== undefined) updates.plan = data.plan;
      if (data.message_credits_limit !== undefined) updates.message_credits_limit = data.message_credits_limit;
      if (data.message_credits_used !== undefined) updates.message_credits_used = data.message_credits_used;
      if (data.is_admin !== undefined) updates.is_admin = data.is_admin;
      if (data.name !== undefined) updates.name = data.name;

      if (Object.keys(updates).length === 0) return { updated: false };

      const { error } = await admin.from("users").update(updates).eq("id", data.userId);
      if (error) throw new DatabaseError(error.message);

      await logAdminAction({
        adminId,
        action: "user_updated",
        targetUserId: data.userId,
        metadata: { updates },
      });

      return { updated: true };
    } catch (error) {
      throw handleServerError(error, "adminUpdateUser");
    }
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { admin, adminId } = await requireAdmin();

      // Get user info for cleanup
      const { data: dbUser } = await admin
        .from("users")
        .select("stripe_customer_id, email")
        .eq("id", data.userId)
        .single();

      if (!dbUser) throw new NotFoundError("User");

      // Cancel Stripe subscription
      if (dbUser.stripe_customer_id) {
        try {
          const stripe = getStripeClient();
          const subs = await stripe.subscriptions.list({ customer: dbUser.stripe_customer_id, limit: 1 });
          for (const sub of subs.data) {
            if (["active", "trialing", "past_due"].includes(sub.status)) {
              await stripe.subscriptions.cancel(sub.id);
            }
          }
        } catch { /* best effort */ }
      }

      // Delete user data
      const { data: chatbots } = await admin
        .from("chatbots")
        .select("id")
        .eq("user_id", data.userId);

      const botIds = (chatbots ?? []).map(c => c.id);
      if (botIds.length > 0) {
        await admin.from("messages").delete().in("conversation_id",
          (await admin.from("conversations").select("id").in("chatbot_id", botIds)).data?.map(c => c.id) || []
        );
        await admin.from("conversations").delete().in("chatbot_id", botIds);
        await admin.from("embeddings").delete().in("chatbot_id", botIds);
        await admin.from("sources").delete().in("chatbot_id", botIds);
        await admin.from("ai_actions").delete().in("chatbot_id", botIds);
        await admin.from("chatbots").delete().eq("user_id", data.userId);
      }

      await admin.from("users").delete().eq("id", data.userId);

      try {
        await admin.auth.admin.deleteUser(data.userId);
      } catch { /* best effort */ }

      await logAdminAction({
        adminId,
        action: "user_deleted",
        targetUserId: data.userId,
        metadata: { email: dbUser.email },
      });

      return { deleted: true };
    } catch (error) {
      throw handleServerError(error, "adminDeleteUser");
    }
  });

export const adminListAllChatbots = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(25),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { admin } = await requireAdmin();

      let query = admin
        .from("chatbots")
        .select("id, user_id, name, status, message_count, model, created_at, updated_at", { count: "exact" });

      if (data.search) {
        query = query.or(`name.ilike.%${data.search}%`);
      }

      if (data.status && data.status !== "all") {
        query = query.eq("status", data.status);
      }

      const sortColumn = data.sortBy || "created_at";
      const sortOrder = data.sortOrder || "desc";
      query = query.order(sortColumn, { ascending: sortOrder === "asc" });

      const from = (data.page - 1) * data.pageSize;
      const to = from + data.pageSize - 1;
      query = query.range(from, to);

      const { data: chatbots, count, error } = await query;
      if (error) throw new DatabaseError(error.message);

      // Get owner emails
      const userIds = [...new Set(chatbots.map(c => c.user_id))];
      const { data: owners } = await admin
        .from("users")
        .select("id, email, name")
        .in("id", userIds);

      const ownerMap = new Map((owners ?? []).map((u: { id: string; email: string; name: string }) => [u.id, { email: u.email, name: u.name }]));

      const chatbotsWithOwners = chatbots.map(c => ({
        ...c,
        owner_email: ownerMap.get(c.user_id)?.email || "unknown",
        owner_name: ownerMap.get(c.user_id)?.name || "unknown",
      }));

      return {
        chatbots: chatbotsWithOwners,
        total: count ?? 0,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: Math.ceil((count ?? 0) / data.pageSize),
      };
    } catch (error) {
      throw handleServerError(error, "adminListAllChatbots");
    }
  });

export const adminGetChatbot = createServerFn({ method: "GET" })
  .inputValidator(z.object({ chatbotId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { admin } = await requireAdmin();

      const { data: chatbot, error } = await admin
        .from("chatbots")
        .select("*")
        .eq("id", data.chatbotId)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!chatbot) throw new NotFoundError("Chatbot");

      // Get owner
      const { data: owner } = await admin
        .from("users")
        .select("id, email, name")
        .eq("id", chatbot.user_id)
        .single();

      // Get sources
      const { data: sources } = await admin
        .from("sources")
        .select("*")
        .eq("chatbot_id", data.chatbotId);

      // Get conversation stats
      const { count: totalConversations } = await admin
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("chatbot_id", data.chatbotId);

      return {
        chatbot,
        owner: owner || { id: "", email: "unknown", name: "Unknown" },
        sources: sources ?? [],
        totalConversations: totalConversations ?? 0,
      };
    } catch (error) {
      throw handleServerError(error, "adminGetChatbot");
    }
  });

export const adminDeleteChatbot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ chatbotId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { admin, adminId } = await requireAdmin();

      const { data: chatbot } = await admin
        .from("chatbots")
        .select("name, user_id")
        .eq("id", data.chatbotId)
        .single();

      if (!chatbot) throw new NotFoundError("Chatbot");

      // Cascade delete
      await admin.from("messages").delete().in("conversation_id",
        (await admin.from("conversations").select("id").eq("chatbot_id", data.chatbotId)).data?.map(c => c.id) || []
      );
      await admin.from("conversations").delete().eq("chatbot_id", data.chatbotId);
      await admin.from("embeddings").delete().eq("chatbot_id", data.chatbotId);
      await admin.from("sources").delete().eq("chatbot_id", data.chatbotId);
      await admin.from("ai_actions").delete().eq("chatbot_id", data.chatbotId);
      await admin.from("chatbots").delete().eq("id", data.chatbotId);

      await logAdminAction({
        adminId,
        action: "chatbot_deleted",
        targetUserId: chatbot.user_id,
        targetResource: "chatbot",
        resourceId: data.chatbotId,
        metadata: { name: chatbot.name },
      });

      return { deleted: true };
    } catch (error) {
      throw handleServerError(error, "adminDeleteChatbot");
    }
  });

export const adminGetBillingStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { admin } = await requireAdmin();

      const stripe = getStripeClient();

      // Get all paid users
      const { data: paidUsers } = await admin
        .from("users")
        .select("plan, stripe_subscription_id, stripe_customer_id")
        .not("plan", "eq", "free");

      // MRR
      let mrr = 0;
      let totalRevenue = 0;
      let subscriptionsData: Record<string, unknown>[] = [];
      let transactionsData: Record<string, unknown>[] = [];

      try {
        const activeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        for (const sub of activeSubs.data) {
          for (const item of sub.items.data) {
            if (item.price.unit_amount) {
              mrr += (item.price.unit_amount / 100);
            }
          }
        }

        // Total revenue
        const allInvoices = await stripe.invoices.list({
          status: "paid",
          limit: 100,
        });
        for (const inv of allInvoices.data) {
          totalRevenue += (inv.amount_paid / 100);
        }

        // Subscriptions list
        for (const sub of activeSubs.data) {
          const customer = await stripe.customers.retrieve(sub.customer).catch(() => null);
          const customerEmail = customer && !customer.deleted ? (customer as { email?: string }).email || "unknown" : "unknown";
          subscriptionsData.push({
            id: sub.id,
            user_email: customerEmail,
            status: sub.status,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: sub.cancel_at_period_end,
            items: sub.items.data.map(item => ({
              amount: (item.price.unit_amount ?? 0) / 100,
              interval: item.price.recurring?.interval,
            })),
          });
        }

        // Recent transactions
        for (const inv of allInvoices.data.slice(0, 50)) {
          const customer = await stripe.customers.retrieve(inv.customer as string).catch(() => null);
          const customerEmail = customer && !customer.deleted ? (customer as { email?: string }).email || "unknown" : "unknown";
          transactionsData.push({
            id: inv.id,
            date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            user_email: customerEmail,
            amount: inv.amount_paid / 100,
            status: inv.status,
            plan: "subscription",
          });
        }
      } catch (err) {
        console.error("[adminBilling] Stripe error:", err);
      }

      const arr = mrr * 12;
      const arpu = paidUsers.length > 0 ? mrr / paidUsers.length : 0;
      const churnRate = 0; // Would need historical tracking

      return {
        mrr,
        arr,
        totalRevenue,
        arpu,
        churnRate,
        totalSubscriptions: paidUsers.length,
        subscriptions: subscriptionsData,
        transactions: transactionsData,
      };
    } catch (error) {
      throw handleServerError(error, "adminGetBillingStats");
    }
  });

export const adminGetAnalytics = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      period: z.enum(["7d", "30d", "90d"]).default("30d"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { admin } = await requireAdmin();

      const days = data.period === "7d" ? 7 : data.period === "90d" ? 90 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // DAU (daily active users = distinct session_ids per day)
      const { data: conversations } = await admin
        .from("conversations")
        .select("session_id, created_at")
        .gte("created_at", startDate);

      const dauMap: Record<string, Set<string>> = {};
      (conversations ?? []).forEach((c: { session_id: string; created_at: string }) => {
        const d = c.created_at.slice(0, 10);
        if (!dauMap[d]) dauMap[d] = new Set();
        dauMap[d].add(c.session_id);
      });
      const dau = Object.entries(dauMap).map(([date, sessions]) => ({ date, count: sessions.size }));

      // Top chatbots by message count
      const { data: topBots } = await admin
        .from("chatbots")
        .select("id, name, message_count")
        .order("message_count", { ascending: false })
        .limit(10);

      // Top users by usage
      const { data: topChatbots } = await admin
        .from("chatbots")
        .select("user_id, message_count")
        .order("message_count", { ascending: false });

      const userMsgTotal: Record<string, number> = {};
      (topChatbots ?? []).forEach((c: { user_id: string; message_count: number }) => {
        userMsgTotal[c.user_id] = (userMsgTotal[c.user_id] ?? 0) + (c.message_count ?? 0);
      });

      const topUserIds = Object.entries(userMsgTotal)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      const { data: topUsers } = await admin
        .from("users")
        .select("id, email, name")
        .in("id", topUserIds);

      const topUsersByUsage = (topUsers ?? []).map(u => ({
        ...u,
        total_messages: userMsgTotal[u.id] ?? 0,
      })).sort((a, b) => b.total_messages - a.total_messages);

      // Response time stats
      const { data: recentMessages } = await admin
        .from("messages")
        .select("response_time_ms, created_at")
        .eq("role", "assistant")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      const avgResponseTime = (recentMessages ?? []).length > 0
        ? Math.round((recentMessages as { response_time_ms: number }[]).reduce((s, m) => s + (m.response_time_ms ?? 0), 0) / (recentMessages ?? []).length)
        : 0;

      return {
        dau,
        topChatbots: topBots ?? [],
        topUsers: topUsersByUsage,
        avgResponseTime,
        totalConversationsThisPeriod: conversations?.length ?? 0,
      };
    } catch (error) {
      throw handleServerError(error, "adminGetAnalytics");
    }
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { admin } = await requireAdmin();

      const { data: settings, error } = await admin
        .from("platform_settings")
        .select("*");

      if (error) throw new DatabaseError(error.message);

      const settingsMap: Record<string, unknown> = {};
      (settings ?? []).forEach((s: { key: string; value: unknown }) => {
        settingsMap[s.key] = s.value;
      });

      return settingsMap;
    } catch (error) {
      throw handleServerError(error, "adminGetSettings");
    }
  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      key: z.string(),
      value: z.any(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { admin, adminId } = await requireAdmin();

      const { error } = await admin
        .from("platform_settings")
        .upsert({
          key: data.key,
          value: data.value,
          updated_at: new Date().toISOString(),
          updated_by: adminId,
        });

      if (error) throw new DatabaseError(error.message);

      await logAdminAction({
        adminId,
        action: "setting_updated",
        targetResource: "platform_setting",
        resourceId: data.key,
        metadata: { key: data.key },
      });

      return { updated: true };
    } catch (error) {
      throw handleServerError(error, "adminUpdateSetting");
    }
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return { isAdmin: false };

      const admin = getAdminClient();
      const { data } = await admin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      return { isAdmin: (data as { is_admin?: boolean } | null)?.is_admin ?? false };
    } catch {
      return { isAdmin: false };
    }
  });


