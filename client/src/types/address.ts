/** Shape used in checkout and saved-address forms (label + recipient only for saved addresses). */
export type ShippingAddressForm = {
  label: string;
  recipientName: string;
  recipientMobile: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type SavedAddressRow = ShippingAddressForm & {
  id: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function emptyShippingForm(): ShippingAddressForm {
  return {
    label: '',
    recipientName: '',
    recipientMobile: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  };
}
