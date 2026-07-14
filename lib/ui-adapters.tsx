"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  AppliedReferralResult,
  Order,
  OrderStatus,
} from "@/lib/core";

export type AppAuthSession = {
  user?:
    | {
        id?: string;
        email?: string | null;
        name?: string | null;
        role?: string | null;
      }
    | null;
} | null;

export type AppSignInResult = { error?: string | null } | undefined;

export type AppActionResult =
  | { success: true }
  | { success: false; error: string };

export type RegisterCustomerInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
};

export type UpdateCustomerProfileInput = {
  fullName?: string;
  phone?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type RequestPasswordResetInput = {
  email: string;
};

export type ResetPasswordWithTokenInput = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export type CreateOrderInput = {
  items: AppCartItem[];
  subtotal: number;
  cartSubtotal?: number;
  totalUnits: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  billingSameAsShipping?: boolean;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  saveProfile?: boolean;
  referralCode?: string;
  paymentMethod?: "manual" | "card_link";
};

export type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNumber: string;
      shippingCost: number;
      totalAmount: number;
    }
  | {
      success: false;
      error: string;
      errorCode?: "RATE_LIMITED" | "VALIDATION_ERROR" | "UNKNOWN";
      retryAfterSeconds?: number;
    };

export type LookupOrderResult =
  | { success: true; order: Order }
  | { success: false; error: string };

export type OrderStatusFormState = {
  orderId: string;
  status: OrderStatus;
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: number;
  trackingNumber?: string;
  trackingCarrier?: "UPS" | "USPS";
};

export type AgeGateStatus = "approved" | "denied" | "unknown";

export type AgeGateFormState = {
  status: AgeGateStatus;
  message?: string | null;
};

export type AgeGateAction = (
  prevState: AgeGateFormState,
  formData: FormData
) => Promise<AgeGateFormState>;

export type ReferralDashboardActions = {
  createReferralPartnerAction: (formData: FormData) => Promise<void>;
  createReferralCodeAction: (formData: FormData) => Promise<void>;
  toggleReferralPartnerStatusAction: (formData: FormData) => Promise<void>;
  toggleReferralCodeStatusAction: (formData: FormData) => Promise<void>;
  deleteReferralPartnerAction: (formData: FormData) => Promise<void>;
  deleteReferralCodeAction: (formData: FormData) => Promise<void>;
};

export type AppAdapters = {
  support: {
    phoneDisplay: string;
    smsLink: string;
  };
  auth: {
    useSession?: () => { data: AppAuthSession };
    signIn?: (
      provider: string,
      options: Record<string, unknown>
    ) => Promise<AppSignInResult>;
    getSession?: () => Promise<AppAuthSession>;
  };
  customerActions: {
    registerCustomer?: (
      input: RegisterCustomerInput
    ) => Promise<AppActionResult>;
    updateCustomerProfile?: (
      input: UpdateCustomerProfileInput
    ) => Promise<AppActionResult>;
    changePassword?: (input: ChangePasswordInput) => Promise<AppActionResult>;
    requestPasswordReset?: (
      input: RequestPasswordResetInput
    ) => Promise<AppActionResult>;
    resetPasswordWithToken?: (
      input: ResetPasswordWithTokenInput
    ) => Promise<AppActionResult>;
  };
  orderActions: {
    createOrder?: (input: CreateOrderInput) => Promise<CreateOrderResult>;
    lookupOrder?: (input: {
      orderNumber: string;
      customerEmail?: string;
    }) => Promise<LookupOrderResult>;
    submitOrderStatusForm?: (
      prevState: OrderStatusFormState | undefined,
      formData: FormData
    ) => Promise<OrderStatusFormState>;
    deleteOrder?: (
      orderId: string
    ) => Promise<{ success: boolean; error?: string }>;
  };
  referralActions: {
    applyReferralCode?: (input: {
      code: string;
      customerEmail: string;
      cartItems: AppCartItem[];
      cartSubtotal: number;
      customerPhone?: string;
      shippingStreet?: string;
      shippingZipCode?: string;
      shippingCountry?: string;
    }) => Promise<AppliedReferralResult>;
  };
  analytics: {
    trackAddToCart?: (payload: {
      productName: string;
      productSlug?: string;
      tierPrice: number;
      addedCount: number;
    }) => void;
  };
  ageGate: {
    cookieName?: string;
    submitAgeVerification?: AgeGateAction;
    deriveInitialStatus?: () => Promise<AgeGateStatus>;
  };
};

export type AppPricingTier = {
  quantity: number;
  price: number;
};

export type AppCartItem = {
  key: string;
  productName: string;
  productSlug?: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  pricingTiers: AppPricingTier[];
  count: number;
  variantKey: string;
  maxVariantUnits?: number | null;
};

type AppAdapterOverrides = Partial<{
  support: Partial<AppAdapters["support"]>;
  auth: AppAdapters["auth"];
  customerActions: AppAdapters["customerActions"];
  orderActions: AppAdapters["orderActions"];
  referralActions: AppAdapters["referralActions"];
  analytics: AppAdapters["analytics"];
  ageGate: AppAdapters["ageGate"];
}>;

const defaultAdapters: AppAdapters = {
  support: {
    phoneDisplay: "+1 (307) 202-5965",
    smsLink: "sms:+13072025965",
  },
  auth: {},
  customerActions: {},
  orderActions: {},
  referralActions: {},
  analytics: {},
  ageGate: {},
};

const AppAdapterContext = createContext<AppAdapters>(defaultAdapters);

export function AppAdapterProvider({
  adapters,
  children,
}: {
  adapters?: AppAdapterOverrides;
  children: ReactNode;
}) {
  const merged = useMemo<AppAdapters>(
    () => ({
      support: {
        ...defaultAdapters.support,
        ...adapters?.support,
      },
      auth: {
        ...defaultAdapters.auth,
        ...adapters?.auth,
      },
      customerActions: {
        ...defaultAdapters.customerActions,
        ...adapters?.customerActions,
      },
      orderActions: {
        ...defaultAdapters.orderActions,
        ...adapters?.orderActions,
      },
      referralActions: {
        ...defaultAdapters.referralActions,
        ...adapters?.referralActions,
      },
      analytics: {
        ...defaultAdapters.analytics,
        ...adapters?.analytics,
      },
      ageGate: {
        ...defaultAdapters.ageGate,
        ...adapters?.ageGate,
      },
    }),
    [adapters]
  );

  return (
    <AppAdapterContext.Provider value={merged}>
      {children}
    </AppAdapterContext.Provider>
  );
}

export function useAppAdapters() {
  return useContext(AppAdapterContext);
}

export function requireAppAdapter<T>(value: T | undefined, name: string): T {
  if (typeof value === "undefined") {
    throw new Error(
      `Missing app adapter: ${name}. Wrap your app in AppAdapterProvider and provide this adapter.`
    );
  }
  return value;
}

export function createUnsupportedAppActionResult(
  message: string
): AppActionResult {
  return { success: false, error: message };
}
