import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import { IconAdd, IconDelete, IconRemove } from '../icons';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import { useCart, type CartLine } from '../context/CartContext';
import { formatInrFromPaise } from '../utils/format';

type CartDisplayRow =
  | { kind: 'bundle'; groupId: string; title: string; unitTotalPaise: number; qty: number; image?: string }
  | { kind: 'single'; line: CartLine };

function toDisplayRows(lines: CartLine[]): CartDisplayRow[] {
  const seenBundle = new Set<string>();
  const rows: CartDisplayRow[] = [];
  for (const l of lines) {
    if (l.bundleGroupId) {
      if (seenBundle.has(l.bundleGroupId)) continue;
      seenBundle.add(l.bundleGroupId);
      rows.push({
        kind: 'bundle',
        groupId: l.bundleGroupId,
        title: l.bundleDisplayName ?? 'Bundle',
        unitTotalPaise: l.bundleUnitTotalPaise ?? l.price,
        qty: l.qty,
        image: l.bundleImage ?? l.image,
      });
    } else {
      rows.push({ kind: 'single', line: l });
    }
  }
  return rows;
}

export function CartPage() {
  const { lines, setQty, setBundleQty, remove, removeBundle, totalPaise } = useCart();
  const displayRows = useMemo(() => toDisplayRows(lines), [lines]);

  if (lines.length === 0) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="h6">Your cart is empty</Typography>
        <Button component={RouterLink} variant="contained" to="/">
          Continue shopping
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Cart
      </Typography>
      {displayRows.map((row) =>
        row.kind === 'bundle' ? (
          <Paper key={row.groupId} sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 0 }} alignItems="center">
                <Avatar
                  variant="rounded"
                  src={row.image}
                  alt=""
                  sx={{ width: 64, height: 64, bgcolor: 'grey.200' }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700}>{row.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatInrFromPaise(row.unitTotalPaise)} per set · {formatInrFromPaise(row.unitTotalPaise * row.qty)} total
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Combined set (multiple SKUs)
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={() => setBundleQty(row.groupId, row.qty - 1)} aria-label="decrease qty">
                  <IconRemove />
                </IconButton>
                <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{row.qty}</Typography>
                <IconButton size="small" onClick={() => setBundleQty(row.groupId, row.qty + 1)} aria-label="increase qty">
                  <IconAdd />
                </IconButton>
                <IconButton color="error" onClick={() => removeBundle(row.groupId)} aria-label="remove">
                  <IconDelete />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <Paper key={row.line.productId} sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={700}>{row.line.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatInrFromPaise(row.line.price)} each
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={() => setQty(row.line.productId, row.line.qty - 1)} aria-label="decrease qty">
                  <IconRemove />
                </IconButton>
                <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{row.line.qty}</Typography>
                <IconButton size="small" onClick={() => setQty(row.line.productId, row.line.qty + 1)} aria-label="increase qty">
                  <IconAdd />
                </IconButton>
                <IconButton color="error" onClick={() => remove(row.line.productId)} aria-label="remove">
                  <IconDelete />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        ),
      )}

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={700}>
            Total
          </Typography>
          <Typography variant="h6">{formatInrFromPaise(totalPaise)}</Typography>
        </Stack>
        <Button component={RouterLink} fullWidth sx={{ mt: 2 }} variant="contained" size="large" to="/checkout">
          Proceed to checkout
        </Button>
      </Paper>
    </Stack>
  );
}
