import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import {
  DEFAULT_SHOP_PAGE_SIZE,
  SHOP_PAGE_SIZE_OPTIONS,
  type ShopPageSize,
} from '../../constants/shopPagination';
import { shopSurface } from '../../constants/shopSurface';
import type { ProductListPagination } from '../../types/pagination';

type ShopPaginationProps = {
  pagination: ProductListPagination;
  pageSize: ShopPageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ShopPageSize) => void;
  disabled?: boolean;
};

function pageRangeLabel(pagination: ProductListPagination): string {
  if (pagination.total === 0) return '0 items';
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return `${start}–${end} of ${pagination.total}`;
}

export function ShopPagination({
  pagination,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: ShopPaginationProps) {
  const { page, totalPages, hasPrev, hasNext, total } = pagination;
  const showNav = total > 0 && totalPages > 1;

  function handlePageSizeChange(event: SelectChangeEvent<string>) {
    const next = parseInt(event.target.value, 10);
    if (SHOP_PAGE_SIZE_OPTIONS.includes(next as ShopPageSize)) {
      onPageSizeChange(next as ShopPageSize);
    }
  }

  return (
    <Box
      role="navigation"
      aria-label="Product pages"
      sx={{
        mt: 3.5,
        pt: 2.5,
        borderTop: '1px solid rgba(26, 26, 26, 0.1)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={{ xs: 2, sm: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: shopSurface.font.body,
              fontSize: '0.8125rem',
              color: shopSurface.inkMuted,
              whiteSpace: 'nowrap',
            }}
          >
            Per page
          </Typography>
          <FormControl size="small" disabled={disabled}>
            <Select
              value={String(pageSize)}
              onChange={handlePageSizeChange}
              aria-label="Products per page"
              sx={{
                minWidth: 72,
                fontFamily: shopSurface.font.body,
                fontSize: '0.8125rem',
                bgcolor: shopSurface.white,
                color: shopSurface.ink,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(26, 26, 26, 0.14)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(26, 26, 26, 0.28)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: shopSurface.filterToggle.selectedBorder,
                },
                '& .MuiSelect-icon': { color: shopSurface.inkMuted },
              }}
            >
              {SHOP_PAGE_SIZE_OPTIONS.map((size) => (
                <MenuItem key={size} value={String(size)} sx={{ fontSize: '0.8125rem' }}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography
            sx={{
              fontFamily: shopSurface.font.body,
              fontSize: '0.8125rem',
              color: shopSurface.inkMuted,
              whiteSpace: 'nowrap',
            }}
          >
            {pageRangeLabel(pagination)}
          </Typography>
        </Stack>

        {showNav ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}>
            <IconButton
              aria-label="Previous page"
              disabled={disabled || !hasPrev}
              onClick={() => onPageChange(page - 1)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0,
                border: '1px solid rgba(26, 26, 26, 0.12)',
                bgcolor: shopSurface.white,
                color: shopSurface.ink,
                '&:hover': { bgcolor: shopSurface.filterToggle.hoverBg },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(255,255,255,0.5)',
                  color: 'rgba(26, 26, 26, 0.28)',
                },
              }}
            >
              <IconChevronLeft fontSize="small" />
            </IconButton>

            <Typography
              aria-live="polite"
              sx={{
                fontFamily: shopSurface.font.body,
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: shopSurface.ink,
                minWidth: 88,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Page {page} of {totalPages}
            </Typography>

            <IconButton
              aria-label="Next page"
              disabled={disabled || !hasNext}
              onClick={() => onPageChange(page + 1)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0,
                border: '1px solid rgba(26, 26, 26, 0.12)',
                bgcolor: shopSurface.ink,
                color: shopSurface.white,
                '&:hover': { bgcolor: '#333' },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(5, 11, 24, 0.35)',
                  color: 'rgba(255,255,255,0.7)',
                },
              }}
            >
              <IconChevronRight fontSize="small" />
            </IconButton>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

export function emptyShopPagination(pageSize: ShopPageSize = DEFAULT_SHOP_PAGE_SIZE): ProductListPagination {
  return {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
}
