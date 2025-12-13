export type ReferralDiscountMode = "percent" | "fixed";

export type ReferralCodeSummary = {
  id: string;
  partnerId: string;
  code: string;
  description?: string | null;
  discountType: ReferralDiscountMode;
  discountValue: number;
  minOrderSubtotal?: number | null;
  maxRedemptionsPerCustomer: number;
  maxTotalRedemptions?: number | null;
  currentRedemptions: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReferralPartnerSummary = {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  defaultDiscountType: ReferralDiscountMode;
  defaultDiscountValue: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  totalCustomers: number;
  totalRevenue: number;
  lastOrderAt?: string | null;
  codes: ReferralCodeSummary[];
};

export type ReferralDashboardTotals = {
  partners: number;
  activePartners: number;
  activeCodes: number;
  totalCustomers: number;
  attributedOrdersLast30Days: number;
  lifetimeRevenue: number;
};

export type ReferralDashboardData = {
  totals: ReferralDashboardTotals;
  partners: ReferralPartnerSummary[];
};

export type AppliedReferralResult =
  | {
    status: "applied";
    code: string;
    partnerId: string;
    partnerName: string;
    discountAmount: number;
    discountType: ReferralDiscountMode;
    discountValue: number;
    message: string;
  }
  | {
    status: "already-attributed";
    partnerId: string;
    partnerName: string;
    attributionId: string;
    message: string;
  }
  | {
    status: "error";
    message: string;
  };

