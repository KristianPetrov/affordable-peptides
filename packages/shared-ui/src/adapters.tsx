"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  AppliedReferralResult,
  Order,
  OrderStatus,
} from "@ap/shared-core";

export type SharedUiAuthSession = {
  user?:
    | {
        id?: string;
        email?: string | null;
        name?: string | null;
        role?: string | null;
      }
    | null;
} | null;

export type SharedUiSignInResult = { error?: string | null } | undefined;

export type SharedUiActionResult =
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
  items: SharedUiCartItem[];
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
  saveProfile?: boolean;
  referralCode?: string;
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

export type SharedUiAdapters = {
  support: {
    phoneDisplay: string;
    smsLink: string;
  };
  auth: {
    useSession?: () => { data: SharedUiAuthSession };
    signIn?: (
      provider: string,
      options: Record<string, unknown>
    ) => Promise<SharedUiSignInResult>;
    getSession?: () => Promise<SharedUiAuthSession>;
  };
  customerActions: {
    registerCustomer?: (
      input: RegisterCustomerInput
    ) => Promise<SharedUiActionResult>;
    updateCustomerProfile?: (
      input: UpdateCustomerProfileInput
    ) => Promise<SharedUiActionResult>;
    changePassword?: (input: ChangePasswordInput) => Promise<SharedUiActionResult>;
    requestPasswordReset?: (
      input: RequestPasswordResetInput
    ) => Promise<SharedUiActionResult>;
    resetPasswordWithToken?: (
      input: ResetPasswordWithTokenInput
    ) => Promise<SharedUiActionResult>;
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
      cartItems: SharedUiCartItem[];
      cartSubtotal: number;
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

export type SharedUiPricingTier = {
  quantity: number;
  price: number;
};

export type SharedUiCartItem = {
  key: string;
  productName: string;
  productSlug?: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  pricingTiers: SharedUiPricingTier[];
  count: number;
  variantKey: string;
  maxVariantUnits?: number | null;
};

type SharedUiAdapterOverrides = Partial<{
  support: Partial<SharedUiAdapters["support"]>;
  auth: SharedUiAdapters["auth"];
  customerActions: SharedUiAdapters["customerActions"];
  orderActions: SharedUiAdapters["orderActions"];
  referralActions: SharedUiAdapters["referralActions"];
  analytics: SharedUiAdapters["analytics"];
  ageGate: SharedUiAdapters["ageGate"];
}>;

const defaultAdapters: SharedUiAdapters = {
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

const SharedUiAdapterContext = createContext<SharedUiAdapters>(defaultAdapters);

export function SharedUiAdapterProvider({
  adapters,
  children,
}: {
  adapters?: SharedUiAdapterOverrides;
  children: ReactNode;
}) {
  const merged = useMemo<SharedUiAdapters>(
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
    <SharedUiAdapterContext.Provider value={merged}>
      {children}
    </SharedUiAdapterContext.Provider>
  );
}

export function useSharedUiAdapters() {
  return useContext(SharedUiAdapterContext);
}

export function requireSharedUiAdapter<T>(value: T | undefined, name: string): T {
  if (typeof value === "undefined") {
    throw new Error(
      `Missing shared UI adapter: ${name}. Wrap your app in SharedUiAdapterProvider and provide this adapter.`
    );
  }
  return value;
}

export function createUnsupportedSharedUiActionResult(
  message: string
): SharedUiActionResult {
  return { success: false, error: message };
}
