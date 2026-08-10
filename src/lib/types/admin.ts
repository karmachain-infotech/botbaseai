export interface AdminDashboardData {
  totalUsers: number;
  userGrowthPercent: number;
  totalChatbots: number;
  totalMessages: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  churnedUsersThisMonth: number;
  userSignupsOverTime: { date: string; count: number }[];
  messagesPerDay: { date: string; count: number }[];
  revenueOverTime: { date: string; amount: number }[];
  planDistribution: { plan: string; count: number }[];
  recentSignups: {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
  }[];
  recentChatbots: {
    id: string;
    name: string;
    user_email: string;
    created_at: string;
  }[];
  recentSubscriptionChanges: {
    id: string;
    user_email: string;
    plan: string;
    action: string;
    created_at: string;
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  is_admin: boolean;
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  message_credits_used: number;
  message_credits_limit: number;
}

export interface AdminChatbot {
  id: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  status: string;
  message_count: number;
  created_at: string;
}

export interface AdminChatbotDetail {
  id: string;
  name: string;
  model: string;
  status: string;
  language: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  instructions: string | null;
}

export interface AdminSource {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface AdminBillingStats {
  mrr: number;
  arr: number;
  totalRevenue: number;
  arpu: number;
  totalSubscriptions: number;
  subscriptions: {
    id: string;
    user_email: string;
    status: string;
    items: { amount: number; interval: string }[];
    current_period_end: string;
  }[];
  transactions: {
    id: string;
    date: string;
    user_email: string;
    amount: number;
    status: string;
  }[];
}

export interface AdminAnalyticsData {
  totalConversationsThisPeriod: number;
  avgResponseTime: number;
  topChatbots: { name: string; count: number }[];
  topUsers: { name: string; email: string; count: number }[];
  dau: { date: string; count: number }[];
}
