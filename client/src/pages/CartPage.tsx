import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import { IconAdd, IconDelete, IconRemove } from '../icons';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatInrFromPaise } from '../utils/format';

export function CartPage() {
  const { lines, setQty, remove, totalPaise } = useCart();

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
      {lines.map((line) => (
        <Paper key={line.productId} sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{line.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatInrFromPaise(line.price)} each
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={() => setQty(line.productId, line.qty - 1)} aria-label="decrease qty">
                <IconRemove />
              </IconButton>
              <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{line.qty}</Typography>
              <IconButton size="small" onClick={() => setQty(line.productId, line.qty + 1)} aria-label="increase qty">
                <IconAdd />
              </IconButton>
              <IconButton color="error" onClick={() => remove(line.productId)} aria-label="remove">
                <IconDelete />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      ))}

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
