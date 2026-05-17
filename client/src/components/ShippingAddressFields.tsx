import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { ShippingAddressForm } from '../types/address';
import { INDIAN_STATES_AND_UTS } from '../constants/indianStates';

type Props = {
  value: ShippingAddressForm;
  onChange: (next: ShippingAddressForm) => void;
  /** When true, show address label (e.g. Home, Office). */
  showLabel?: boolean;
  /** When true, show recipient name and mobile (saved addresses). */
  showRecipient?: boolean;
};

export function ShippingAddressFields({ value, onChange, showLabel, showRecipient }: Props) {
  const countryIsIndia =
    value.country.trim().toUpperCase() === 'IN' || value.country.trim().length === 0;

  function patch(p: Partial<ShippingAddressForm>) {
    onChange({ ...value, ...p });
  }

  return (
    <Stack spacing={2}>
      {showLabel && (
        <TextField
          label="Address label"
          required
          fullWidth
          placeholder="e.g. Home, Office"
          value={value.label}
          onChange={(e) => patch({ label: e.target.value })}
          inputProps={{ maxLength: 80 }}
        />
      )}
      {showRecipient && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Recipient name"
            required
            fullWidth
            value={value.recipientName}
            onChange={(e) => patch({ recipientName: e.target.value })}
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            label="Recipient mobile"
            required
            fullWidth
            placeholder="10-digit mobile"
            value={value.recipientMobile}
            onChange={(e) => patch({ recipientMobile: e.target.value })}
            inputProps={{ inputMode: 'tel', maxLength: 20 }}
            helperText="For delivery contact"
          />
        </Stack>
      )}
      <TextField
        label="Address line 1"
        required
        fullWidth
        value={value.line1}
        onChange={(e) => patch({ line1: e.target.value })}
      />
      <TextField
        label="Address line 2"
        fullWidth
        value={value.line2}
        onChange={(e) => patch({ line2: e.target.value })}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="City"
          required
          fullWidth
          value={value.city}
          onChange={(e) => patch({ city: e.target.value })}
        />
        {countryIsIndia ? (
          <TextField
            select
            label="State / UT"
            required
            fullWidth
            value={value.state}
            onChange={(e) => patch({ state: e.target.value })}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">
              <em>Select state</em>
            </MenuItem>
            {INDIAN_STATES_AND_UTS.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            label="State / Province"
            required
            fullWidth
            value={value.state}
            onChange={(e) => patch({ state: e.target.value })}
          />
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="PIN / Postal code"
          required
          fullWidth
          value={value.postalCode}
          onChange={(e) => patch({ postalCode: e.target.value })}
        />
        <TextField
          label="Country"
          fullWidth
          value={value.country}
          onChange={(e) => patch({ country: e.target.value })}
          inputProps={{ maxLength: 4 }}
        />
      </Stack>
    </Stack>
  );
}
