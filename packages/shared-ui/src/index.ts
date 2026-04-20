export { SharedUiAdapterProvider, useSharedUiAdapters } from "./adapters";
export type {
  SharedUiAdapters,
  SharedUiAuthSession,
  SharedUiSignInResult,
  SharedUiActionResult,
  CreateOrderInput,
  CreateOrderResult,
  LookupOrderResult,
  RegisterCustomerInput,
  UpdateCustomerProfileInput,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ResetPasswordWithTokenInput,
  OrderStatusFormState,
  AgeGateStatus,
  AgeGateAction,
  AgeGateFormState,
  ReferralDashboardActions,
  PrepareGreenPlaidPayorInput,
  PrepareGreenPlaidPayorResult,
  GreenPlaidLinkedBankDisplay,
  FetchGreenPlaidBankResult,
} from "./adapters";

export { default as NavBar } from "./components/NavBar";
export { default as ProductMockup } from "./components/ProductMockup";
export { default as Disclaimer } from "./components/Disclaimer";
export { default as MoleculeViewer } from "./components/MoleculeViewer";
export { AgeGate } from "./components/AgeGate";
export { Providers } from "./components/Providers";

export {
  AnalyticsConsentProvider,
  useAnalyticsConsent,
  AnalyticsConsentBanner,
} from "./components/analytics/AnalyticsConsent";
export { TikTokPixel } from "./components/analytics/TikTokPixel";

export { default as HeroShowcase } from "./components/home/HeroShowcase";
export { default as HeroMoleculePreview } from "./components/home/HeroMoleculePreview";
export { default as ReviewsSection } from "./components/home/ReviewsSection";
export { default as ResearchSection } from "./components/home/ResearchSection";
export { default as MissionSection } from "./components/home/MissionSection";
export { default as VisionSection } from "./components/home/VisionSection";

export { StorefrontProvider, useStorefront } from "./components/store/StorefrontContext";
export type { AddToCartPayload, CartItem } from "./components/store/StorefrontContext";
export {
  default as StoreClient,
  ProductCard,
  FloatingCartButton,
} from "./components/store/StoreClient";
export { default as ProductModal } from "./components/store/ProductModal";
export { default as ProductDetailStandalone } from "./components/store/ProductDetailStandalone";

export { CheckoutClient } from "./components/checkout/CheckoutClient";
export { default as OrderLookupClient } from "./components/orders/OrderLookupClient";

export { AccountLoginForm } from "./components/account/AccountLoginForm";
export { AccountRegisterForm } from "./components/account/AccountRegisterForm";
export { ForgotPasswordForm } from "./components/account/ForgotPasswordForm";
export { ResetPasswordForm } from "./components/account/ResetPasswordForm";
export { ProfileForm } from "./components/account/ProfileForm";
export { PasswordChangeForm } from "./components/account/PasswordChangeForm";
export { AccountSidebar } from "./components/account/AccountSidebar";

export { CopyButton } from "./components/admin/CopyButton";
export { OrderStatusForm } from "./components/admin/OrderStatusForm";
export { TrackingNumberInput } from "./components/admin/TrackingNumberInput";
export { DeleteOrderButton } from "./components/admin/DeleteOrderButton";
export { default as ReferralDashboard } from "./components/admin/ReferralDashboard";
