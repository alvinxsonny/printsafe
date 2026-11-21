export interface PlanLimits {
  jobs_per_month?: number;
  customers_per_month?: number | null;
  devices?: number;
  staff_logins?: number;
  uploads_per_month?: number;
  vault_mb?: number;
  priority_list?: boolean;
  analytics?: boolean;
}

export interface PlanDefinition {
  id: string;
  audience: "merchant" | "customer";
  code: string;
  name: string;
  pricePaise: number;
  periodDays: number;
  limits: PlanLimits;
  active: boolean;
}

export const PLANS: PlanDefinition[] = [
  // Merchant Plans (Section 11)
  {
    id: "merchant_starter",
    audience: "merchant",
    code: "starter",
    name: "Starter",
    pricePaise: 29900, // ₹299
    periodDays: 30,
    limits: {
      jobs_per_month: 100,
      customers_per_month: 50,
      devices: 1,
      staff_logins: 1,
    },
    active: true,
  },
  {
    id: "merchant_growth",
    audience: "merchant",
    code: "growth",
    name: "Growth",
    pricePaise: 59900, // ₹599
    periodDays: 30,
    limits: {
      jobs_per_month: 500,
      customers_per_month: 250,
      devices: 2,
      staff_logins: 2,
      priority_list: true,
    },
    active: true,
  },
  {
    id: "merchant_pro",
    audience: "merchant",
    code: "pro",
    name: "Pro",
    pricePaise: 99900, // ₹999
    periodDays: 30,
    limits: {
      jobs_per_month: 1500,
      customers_per_month: null, // Unlimited
      devices: 5,
      staff_logins: 5,
      analytics: true,
    },
    active: true,
  },

  // Customer Plans (Section 11)
  {
    id: "customer_free",
    audience: "customer",
    code: "free",
    name: "Free",
    pricePaise: 0,
    periodDays: 3650, // Long-lived free tier
    limits: {
      uploads_per_month: 10,
      vault_mb: 100,
    },
    active: true,
  },
  {
    id: "customer_plus",
    audience: "customer",
    code: "plus",
    name: "Plus",
    pricePaise: 4900, // ₹49
    periodDays: 30,
    limits: {
      uploads_per_month: 100,
      vault_mb: 2048, // 2 GB
    },
    active: true,
  },
];
