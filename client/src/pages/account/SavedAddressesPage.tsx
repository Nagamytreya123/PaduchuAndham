import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { apiFetch } from '../../api/client';
import { ShippingAddressFields } from '../../components/ShippingAddressFields';
import type { SavedAddressRow, ShippingAddressForm } from '../../types/address';
import { emptyShippingForm } from '../../types/address';
import { shopSurface } from '../../constants/shopSurface';

const MAX_ADDRESSES = 10;

function LocationPinIcon() {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24" sx={{ color: 'text.secondary' }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </SvgIcon>
  );
}

function DefaultCheckIcon() {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24" sx={{ color: 'inherit' }}>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </SvgIcon>
  );
}

function formatStreetBlock(row: SavedAddressRow): string {
  const tail = [row.city, row.state].filter(Boolean).join(', ');
  return [row.line1, row.line2, tail].filter((s) => s && String(s).trim().length > 0).join(' · ');
}

export function SavedAddressesPage() {
  const [rows, setRows] = useState<SavedAddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShippingAddressForm>(emptyShippingForm());
  const [makeDefault, setMakeDefault] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<{ addresses: SavedAddressRow[] }>('/api/me/addresses');
    setRows(data.addresses);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load addresses');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyShippingForm());
    setMakeDefault(rows.length === 0);
    setDialogOpen(true);
    setError(null);
  }

  function openEdit(row: SavedAddressRow) {
    setEditingId(row.id);
    setForm({
      label: row.label,
      recipientName: row.recipientName ?? '',
      recipientMobile: row.recipientMobile ?? '',
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      country: row.country,
    });
    setMakeDefault(row.isDefault);
    setDialogOpen(true);
    setError(null);
  }

  const formValid =
    form.label.trim().length > 0 &&
    form.recipientName.trim().length > 0 &&
    form.recipientMobile.replace(/\D/g, '').length >= 10 &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    form.postalCode.trim().length > 0;

  async function saveDialog() {
    if (!formValid) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        line2: form.line2 || undefined,
        isDefault: makeDefault,
      };
      if (editingId) {
        await apiFetch(`/api/me/addresses/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/me/addresses', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            isDefault: makeDefault || rows.length === 0,
          }),
        });
      }
      await load();
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/me/addresses/${id}/set-default`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update default');
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setError(null);
    try {
      await apiFetch(`/api/me/addresses/${deleteId}`, { method: 'DELETE' });
      await load();
      setDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) {
    return (
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Skeleton height={40} width={200} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 2 }}>
      <Button
        component={RouterLink}
        to="/account"
        variant="text"
        size="small"
        sx={{ alignSelf: 'flex-start', fontWeight: 600, color: shopSurface.inkMuted }}
      >
        ← Account
      </Button>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Typography component="h1" sx={shopSurface.pageTitle}>
          Saved addresses
        </Typography>
        <Button
          variant="contained"
          size="small"
          disabled={rows.length >= MAX_ADDRESSES}
          onClick={openAdd}
          sx={{ ...shopSurface.cta, py: 0.75, px: 2 }}
        >
          Add
        </Button>
      </Stack>
      <Typography variant="body2" sx={{ color: shopSurface.inkMuted }}>
        Choose a default for checkout. You can save up to {MAX_ADDRESSES} addresses.
      </Typography>

      {error && !dialogOpen && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {rows.length === 0 ? (
        <Paper elevation={0} sx={{ ...shopSurface.card, p: 3 }}>
          <Typography sx={{ color: shopSurface.inkMuted }} gutterBottom>
            No saved addresses yet.
          </Typography>
          <Button variant="outlined" onClick={openAdd}>
            Add your first address
          </Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => {
            const displayName = row.recipientName?.trim() || row.label;
            const mobile = row.recipientMobile?.trim();
            return (
              <Paper key={row.id} elevation={0} sx={shopSurface.card}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ pt: 0.25, flexShrink: 0 }}>
                    <LocationPinIcon />
                  </Box>
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={0.5} rowGap={0.75}>
                      <Typography component="span" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                        {displayName}
                      </Typography>
                      {mobile ? (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          · {mobile}
                        </Typography>
                      ) : null}
                      <Typography component="span" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                        , {row.postalCode}
                      </Typography>
                      <Chip
                        label={row.label.trim().toUpperCase()}
                        size="small"
                        sx={{
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          letterSpacing: 0.6,
                          bgcolor: 'grey.200',
                          color: 'text.primary',
                          borderRadius: 1,
                          '& .MuiChip-label': { px: 1.25 },
                        }}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {formatStreetBlock(row)}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.25 }}>
                      {!row.isDefault && (
                        <Button size="small" variant="outlined" onClick={() => void setDefault(row.id)}>
                          Set as default
                        </Button>
                      )}
                      <Button size="small" variant="outlined" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button size="small" color="error" variant="text" onClick={() => setDeleteId(row.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                  {row.isDefault ? (
                    <Box
                      aria-label="Default address"
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: 0.125,
                      }}
                    >
                      <DefaultCheckIcon />
                    </Box>
                  ) : null}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit address' : 'Add address'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <ShippingAddressFields showLabel showRecipient value={form} onChange={setForm} />
            <FormControlLabel
              control={<Checkbox checked={makeDefault} onChange={(_, c) => setMakeDefault(c)} />}
              label="Use as default shipping address"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveDialog()} disabled={!formValid || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete this address?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This cannot be undone. If it was your default, another address becomes default.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
