export { AppAdapterProvider, useAppAdapters } from "@/lib/ui-adapters";
export type {
  AgeGateAction,
  AgeGateFormState,
  AgeGateStatus,
  ChangePasswordInput,
  CreateOrderInput,
  CreateOrderResult,
  LookupOrderResult,
  OrderStatusFormState,
  ReferralDashboardActions,
  RegisterCustomerInput,
  RequestPasswordResetInput,
  ResetPasswordWithTokenInput,
  AppActionResult,
  AppAdapters,
  AppAuthSession,
  AppSignInResult,
  UpdateCustomerProfileInput,
} from "@/lib/ui-adapters";

export { default as NavBar } from "./NavBar";
export { default as ProductMockup } from "./ProductMockup";
export { default as Disclaimer } from "./Disclaimer";
export { default as MoleculeViewer } from "./MoleculeViewer";
export { AgeGate } from "./AgeGate";
export { Providers } from "./Providers";

export {
  AnalyticsConsentBanner,
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from "./analytics/AnalyticsConsent";
export { TikTokPixel } from "./analytics/TikTokPixel";

export { default as HeroMoleculePreview } from "./home/HeroMoleculePreview";
export { default as HeroShowcase } from "./home/HeroShowcase";
export { default as MissionSection } from "./home/MissionSection";
export { default as ResearchSection } from "./home/ResearchSection";
export { default as ReviewsSection } from "./home/ReviewsSection";
export { default as VisionSection } from "./home/VisionSection";

export {
  StorefrontProvider,
  useStorefront,
} from "./store/StorefrontContext";
export type {
  AddToCartPayload,
  CartItem,
} from "./store/StorefrontContext";
export {
  FloatingCartButton,
  ProductCard,
  default as StoreClient,
} from "./store/StoreClient";
export { default as ProductDetailStandalone } from "./store/ProductDetailStandalone";
export { default as ProductModal } from "./store/ProductModal";

export { CheckoutClient } from "./checkout/CheckoutClient";
export { default as OrderLookupClient } from "./orders/OrderLookupClient";

export { AccountLoginForm } from "./account/AccountLoginForm";
export { AccountRegisterForm } from "./account/AccountRegisterForm";
export { AccountSidebar } from "./account/AccountSidebar";
export { ForgotPasswordForm } from "./account/ForgotPasswordForm";
export { PasswordChangeForm } from "./account/PasswordChangeForm";
export { ProfileForm } from "./account/ProfileForm";
export { ResetPasswordForm } from "./account/ResetPasswordForm";

export { CopyButton } from "./admin/CopyButton";
export { DeleteOrderButton } from "./admin/DeleteOrderButton";
export { OrderStatusForm } from "./admin/OrderStatusForm";
export { default as ReferralDashboard } from "./admin/ReferralDashboard";
export { TrackingNumberInput } from "./admin/TrackingNumberInput";
