export type AgentStatus = "live" | "draft";

export type Agent = {
  id: string;
  name: string;
  status: AgentStatus;
  messageCount: number;
  lastActive: string;
  sources: number;
};

export const mockAgents: Agent[] = [
  {
    id: "support-bot",
    name: "Support Assistant",
    status: "live",
    messageCount: 3284,
    lastActive: "2 minutes ago",
    sources: 14,
  },
  {
    id: "sales-bot",
    name: "Sales Concierge",
    status: "live",
    messageCount: 1029,
    lastActive: "1 hour ago",
    sources: 8,
  },
  {
    id: "onboarding-bot",
    name: "Onboarding Guide",
    status: "draft",
    messageCount: 0,
    lastActive: "Never",
    sources: 3,
  },
];

export const usage = {
  used: 4313,
  limit: 15000,
  plan: "Pro",
};

export const quickStats = [
  { label: "Total messages", value: "4,313" },
  { label: "Avg response time", value: "1.2s" },
  { label: "Sources", value: "25" },
  { label: "Satisfaction rate", value: "94%" },
];
