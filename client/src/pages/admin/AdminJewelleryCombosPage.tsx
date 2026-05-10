import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { IconDelete } from '../../icons';
import type { AdminProductRow } from '../../types/product';
import type { JewelleryComboSummary } from '../../types/jewelleryCombo';
import { formatInrFromPaise } from '../../utils/format';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function isJewelleryCategory(category: string | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === 'jewellery';
}

async function postMultipart(url: string, fd: FormData): Promise<void> {
  const res = await fetch(url, { method: 'POST', body: fd, credentials: 'include' });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
}

async function patchMultipart(url: string, fd: FormData): Promise<void> {
  const res = await fetch(url, { method: 'PATCH', body: fd, credentials: 'include' });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
}

function jewelleryProductOptions(products: AdminProductRow[], selectedIds: string[]): AdminProductRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const jewellery = products.filter((p) => isJewelleryCategory(p.category));
  const map = new Map<string, AdminProductRow>();
  for (const j of jewellery) map.set(j.id, j);
  for (const id of selectedIds) {
    if (map.has(id)) continue;
    const p = byId.get(id);
    if (p) map.set(id, p);
  }
  return [...map.values()];
}

export function AdminJewelleryCombosPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [combos, setCombos] = useState<JewelleryComboSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceRupee, setPriceRupee] = useState('');
  const [productIdsSelected, setProductIdsSelected] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const [pr, cr] = await Promise.all([
      fetch('/api/admin/products', { credentials: 'include' }),
      fetch('/api/admin/jewellery-combos', { credentials: 'include' }),
    ]);
    const pd = (await pr.json()) as { products: AdminProductRow[] };
    const cd = (await cr.json()) as { combos: JewelleryComboSummary[] };
    if (!pr.ok) throw new Error('Failed to load products');
    if (!cr.ok) throw new Error('Failed to load combos');
    setProducts(pd.products);
    setCombos(cd.combos);
  }

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function openCreate() {
    setEditId(null);
    setName('');
    setImageUrl('');
    setPriceRupee('');
    setProductIdsSelected([]);
    setIsActive(true);
    setFile(null);
    setDialogOpen(true);
  }

  function openEdit(c: JewelleryComboSummary) {
    setEditId(c.id);
    setName(c.name);
    setImageUrl(c.images[0] ?? '');
    setPriceRupee((c.price / 100).toFixed(2));
    setProductIdsSelected([...c.productIds]);
    setIsActive(c.isActive !== false);
    setFile(null);
    setDialogOpen(true);
  }

  const pickerOptions = useMemo(
    () => jewelleryProductOptions(products, productIdsSelected),
    [products, productIdsSelected],
  );

  const pickerValue = useMemo(() => {
    const byId = new Map(pickerOptions.map((p) => [p.id, p]));
    return productIdsSelected.map((id) => byId.get(id)).filter((p): p is AdminProductRow => p != null);
  }, [productIdsSelected, pickerOptions]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const ru = Number(priceRupee);
      if (!Number.isFinite(ru) || ru <= 0) throw new Error('Enter a valid combo price (INR)');
      const paise = Math.round(ru * 100);
      const ids = productIdsSelected.filter((id) => OBJECT_ID_RE.test(id));
      if (ids.length < 2) throw new Error('Link at least two jewellery products');
      if (productIdsSelected.some((id) => !OBJECT_ID_RE.test(id))) throw new Error('Invalid product selection');

      const images: string[] = [];
      if (imageUrl.trim()) images.push(imageUrl.trim());

      const payload = {
        name: name.trim(),
        images: images.length ? images : undefined,
        productIds: ids,
        price: paise,
        isActive,
      };

      const fd = new FormData();
      fd.append('data', JSON.stringify(payload));
      if (file) fd.append('image', file);

      if (editId) {
        await patchMultipart(`/api/admin/jewellery-combos/${editId}`, fd);
      } else {
        await postMultipart('/api/admin/jewellery-combos', fd);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeCombo(id: string) {
    if (!window.confirm('Delete this jewellery combo?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/jewellery-combos/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || 'Delete failed');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Jewellery combos
        </Typography>
        <Button variant="contained" onClick={openCreate}>
          New combo
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Combos are separate from individual products. Each has its own name and image, and links two or more jewellery
        SKUs at one set price. They are not part of the jewellery product form or jewellery subtype filters.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {combos.map((c) => {
          const thumb = c.images[0];
          return (
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component={thumb ? 'img' : 'div'}
                    image={thumb || undefined}
                    sx={{ aspectRatio: '4/3', objectFit: 'cover', bgcolor: 'grey.100', minHeight: 140 }}
                  />
                  {c.isActive === false && (
                    <Chip
                      label="Hidden"
                      size="small"
                      color="warning"
                      sx={{ position: 'absolute', top: 8, left: 8, fontWeight: 700 }}
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {c.name}
                  </Typography>
                  <Typography variant="body2" color="primary.main" fontWeight={700}>
                    {formatInrFromPaise(c.price)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.productIds.length} linked products
                  </Typography>
                  <Stack direction="row" gap={1} sx={{ mt: 'auto' }}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                    <IconButton size="small" color="error" aria-label="delete" onClick={() => void removeCombo(c.id)}>
                      <IconDelete />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {combos.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No jewellery combos yet. Create one with its own image and linked products.
          </Typography>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Edit combo' : 'New jewellery combo'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Combo name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
            <TextField
              label="Image URL (optional if you upload a file)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              fullWidth
              placeholder="https://…"
            />
            <Button variant="outlined" component="label" size="small" sx={{ alignSelf: 'flex-start' }}>
              Upload combo image
              <input type="file" hidden accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>
            {file && (
              <Typography variant="caption" color="text.secondary">
                Selected file: {file.name}
              </Typography>
            )}
            <Autocomplete
              multiple
              options={pickerOptions}
              value={pickerValue}
              onChange={(_, next) => setProductIdsSelected(next.map((p) => p.id))}
              getOptionLabel={(p) => p.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(opts, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return opts;
                return opts.filter(
                  (p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.sku?.toLowerCase().includes(q) ?? false) ||
                    p.id.toLowerCase().includes(q),
                );
              }}
              renderOption={(props, option) => {
                const thumb = option.images[0];
                return (
                  <li {...props} key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Box
                      component={thumb ? 'img' : 'div'}
                      src={thumb || undefined}
                      alt=""
                      sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 1, objectFit: 'cover', bgcolor: 'grey.200' }}
                    />
                    <Stack sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {[option.sku, !isJewelleryCategory(option.category) ? 'Not Jewellery' : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </Stack>
                  </li>
                );
              }}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => {
                  const thumb = option.images[0];
                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      size="small"
                      label={option.name}
                      avatar={
                        thumb ? (
                          <Avatar src={thumb} variant="rounded" sx={{ width: 28, height: 28, fontSize: 14 }} alt="" />
                        ) : undefined
                      }
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Linked jewellery products"
                  placeholder="Search…"
                  helperText="At least two active jewellery SKUs."
                />
              )}
            />
            <TextField
              label="Combo price (INR)"
              value={priceRupee}
              onChange={(e) => setPriceRupee(e.target.value)}
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Visible in shop"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
