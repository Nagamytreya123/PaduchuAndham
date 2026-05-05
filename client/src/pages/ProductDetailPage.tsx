import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { IconAdd, IconRemove } from '../icons';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await apiFetch<{ product: ProductSummary }>(`/api/products/${id}`);
        setProduct(data.product);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <Skeleton variant="rounded" height={320} />;
  }

  if (!product) {
    return (
      <Typography color="text.secondary">
        Product not found.{' '}
        <Button onClick={() => navigate('/')}>Back home</Button>
      </Typography>
    );
  }

  const img = product.images[0];
  const commitQty = Math.min(Math.max(1, qty), product.stock || 1);
  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          aspectRatio: '4/3',
          maxHeight: 420,
        }}
      >
        {img ? (
          <Box component="img" src={img} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <Box sx={{ height: '100%', minHeight: 200 }} />
        )}
      </Box>

      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <Chip label={product.category} color="primary" size="small" sx={{ fontWeight: 700 }} />
        {product.subcategory && <Chip label={product.subcategory} size="small" variant="outlined" />}
        {product.sku && (
          <Typography variant="caption" color="text.secondary">
            SKU {product.sku}
          </Typography>
        )}
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {product.name}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {product.description || 'No description'}
      </Typography>

      <Stack direction="row" alignItems="baseline" gap={1.5} flexWrap="wrap">
        <Typography variant="h6" color="primary.main">
          {formatInrFromPaise(product.price)}
        </Typography>
        {showCompare && (
          <Typography variant="body1" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
            {formatInrFromPaise(product.compareAtPrice!)}
          </Typography>
        )}
      </Stack>

      <Typography variant="body2">
        <strong>In stock:</strong> {product.stock}
      </Typography>

      {(product.materials?.length ?? 0) > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Materials
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {product.materials.map((m) => (
              <Chip key={m} label={m} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}

      {(product.tags?.length ?? 0) > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Tags
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {product.tags.map((t) => (
              <Chip key={t} label={t} size="small" />
            ))}
          </Stack>
        </Box>
      )}

      {product.dimensions?.displayNote && (
        <Typography variant="body2">
          <strong>Size / dimensions:</strong> {product.dimensions.displayNote}
        </Typography>
      )}

      {product.weightGrams != null && (
        <Typography variant="body2" color="text.secondary">
          Approx. packed weight: {product.weightGrams} g
        </Typography>
      )}

      {product.careInstructions && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Care
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {product.careInstructions}
            </Typography>
          </Box>
        </>
      )}

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2">Qty</Typography>
        <IconButton size="small" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="decrease">
          <IconRemove />
        </IconButton>
        <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{commitQty}</Typography>
        <IconButton
          size="small"
          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          disabled={product.stock <= commitQty}
          aria-label="increase"
        >
          <IconAdd />
        </IconButton>
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={product.stock < 1}
        onClick={() => {
          add({
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: commitQty,
            image: img,
          });
          navigate('/cart');
        }}
      >
        Add to cart
      </Button>
    </Stack>
  );
}
