export type CustomerProfile = {
  userId: string;
  fullName: string | null;
  phone: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  shippingCountry: string | null;
  createdAt: string;
  updatedAt: string;
};
