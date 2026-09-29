export const roles = [
  "parent", "school_owner", "school_admin", "school_finance", "school_staff",
  "operations", "underwriter", "finance_operations", "reconciliation", "support",
  "compliance", "risk", "platform_admin", "super_admin"
] as const;

export type AppRole = typeof roles[number];

export const privilegedRoles = roles.filter((role) => role !== "parent" && !role.startsWith("school_"));
