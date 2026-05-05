import { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import { IconDelete } from '../../icons';
import type { ProductSummary } from '../../types/product';
import { formatInrFromPaise } from '../../utils/format';

async function postMultipart(url: string, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
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
  return data as { ok?: boolean };
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

const CATEGORY_PRESETS = ['Sarees', 'Handmade Jewellery', 'General'] as const;

export function AdminProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Sarees');
  const [categoryCustom, setCategoryCustom] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [tags, setTags] = useState('');
  const [materials, setMaterials] = useState('');
  const [dimensionsNote, setDimensionsNote] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [priceRupee, setPriceRupee] = useState('');
  const [compareAtRupee, setCompareAtRupee] = useState('');
  const [stock, setStock] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function reload() {
    const res = await fetch('/api/admin/products', { credentials: 'include' });
    const data = (await res.json()) as { products: ProductSummary[] };
    if (!res.ok) throw new Error('Failed to load products');
    setProducts(data.products);
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function resolvedCategory(): string {
    if (category === '__custom__') return categoryCustom.trim() || 'General';
    return category;
  }

  async function createProduct() {
    setError(null);
    try {
      const rupees = Number(priceRupee);
      if (!Number.isFinite(rupees) || rupees < 0) throw new Error('Invalid price');
      const paise = Math.round(rupees * 100);
      const stockNum = Number(stock);
      if (!Number.isFinite(stockNum) || stockNum < 0) throw new Error('Invalid stock');

      const cat = resolvedCategory();
      if (!cat) throw new Error('Category is required');

      let comparePaise: number | undefined;
      if (compareAtRupee.trim()) {
        const c = Number(compareAtRupee);
        if (!Number.isFinite(c) || c < 0) throw new Error('Invalid compare-at price');
        comparePaise = Math.round(c * 100);
      }

      let wG: number | undefined;
      if (weightGrams.trim()) {
        const w = Number(weightGrams);
        if (!Number.isFinite(w) || w < 0) throw new Error('Invalid weight');
        wG = w;
      }

      const slugTrim = slug.trim().toLowerCase();
      const slugOk = slugTrim.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugTrim);
      if (slugTrim.length > 0 && !slugOk) {
        throw new Error('Slug must be lowercase letters, numbers, and hyphens only (e.g. my-product-name)');
      }

      const urls = splitList(imageUrls);

      const payload: Record<string, unknown> = {
        name,
        description,
        price: paise,
        stock: stockNum,
        category: cat,
        subcategory: subcategory.trim() || undefined,
        sku: sku.trim().toUpperCase() || undefined,
        tags: splitList(tags),
        materials: splitList(materials),
        weightGrams: wG,
        careInstructions: careInstructions.trim() || undefined,
        compareAtPrice: comparePaise,
        images: urls.length ? urls : undefined,
      };

      if (dimensionsNote.trim()) {
        payload.dimensions = { displayNote: dimensionsNote.trim() };
      }
      if (slugTrim.length > 0) payload.slug = slugTrim;

      const fd = new FormData();
      fd.append('data', JSON.stringify(payload));
      if (file) fd.append('image', file);

      await postMultipart('/api/admin/products', fd);
      setName('');
      setDescription('');
      setCategory('Sarees');
      setCategoryCustom('');
      setSubcategory('');
      setSku('');
      setSlug('');
      setTags('');
      setMaterials('');
      setDimensionsNote('');
      setWeightGrams('');
      setCareInstructions('');
      setPriceRupee('');
      setCompareAtRupee('');
      setStock('');
      setImageUrls('');
      setFile(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  }

  async function deleteProduct(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Products
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Add product
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Price is in INR (rupees); stored in paise. Images: URLs and/or one file upload (more images can be added later).
        </Typography>
        <Stack spacing={2}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
            >
              {CATEGORY_PRESETS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
              <MenuItem value="__custom__">Custom…</MenuItem>
            </TextField>
            {category === '__custom__' && (
              <TextField
                label="Custom category"
                value={categoryCustom}
                onChange={(e) => setCategoryCustom(e.target.value)}
                fullWidth
                required
              />
            )}
            <TextField
              label="Subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              fullWidth
              placeholder="e.g. Silk, Necklace"
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} fullWidth placeholder="OPTIONAL-SKU" />
            <TextField
              label="Slug (optional, URL)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              fullWidth
              placeholder="my-product-name"
              helperText="Lowercase, hyphens only"
            />
          </Stack>
          <TextField
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
            placeholder="festive, silk, wedding"
          />
          <TextField
            label="Materials (comma-separated)"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            fullWidth
            placeholder="Mulberry silk, Zari"
          />
          <TextField
            label="Size / dimensions (customer-facing)"
            value={dimensionsNote}
            onChange={(e) => setDimensionsNote(e.target.value)}
            fullWidth
            placeholder="5.5 m with blouse piece"
          />
          <TextField
            label="Weight (g, optional)"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            fullWidth
            type="number"
            inputProps={{ min: 0, step: 1 }}
          />
          <TextField
            label="Care instructions"
            value={careInstructions}
            onChange={(e) => setCareInstructions(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Price (INR)"
              value={priceRupee}
              onChange={(e) => setPriceRupee(e.target.value)}
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="Compare-at price (INR, optional)"
              value={compareAtRupee}
              onChange={(e) => setCompareAtRupee(e.target.value)}
              fullWidth
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              helperText="Shown struck-through if higher than price"
            />
            <TextField
              label="Stock (quantity)"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              fullWidth
              type="number"
              inputProps={{ min: 0, step: 1 }}
            />
          </Stack>
          <TextField
            label="Image URLs (comma-separated, optional)"
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            fullWidth
            helperText="Or upload one file below."
          />
          <Button variant="outlined" component="label">
            Upload image file
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {file && <Typography variant="caption">Selected: {file.name}</Typography>}
          <Button variant="contained" onClick={() => void createProduct()}>
            Save product
          </Button>
        </Stack>
      </Paper>

      <Typography variant="subtitle1" fontWeight={700}>
        All products
      </Typography>
      {products.map((p) => (
        <Paper key={p.id} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Stack spacing={0.5} flex={1}>
              <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
                <Typography fontWeight={700}>{p.name}</Typography>
                <Chip label={p.category} size="small" />
                {p.subcategory && <Chip label={p.subcategory} size="small" variant="outlined" />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {formatInrFromPaise(p.price)}
                {p.sku ? ` · ${p.sku}` : ''} · stock {p.stock}
              </Typography>
            </Stack>
            <IconButton color="error" aria-label="delete" onClick={() => void deleteProduct(p.id)}>
              <IconDelete />
            </IconButton>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
