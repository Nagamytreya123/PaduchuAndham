import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { SxProps, Theme } from '@mui/material/styles';
import type { CatalogPriceFilter } from '../utils/catalogCategory';

const ALL = 'all';

export function PriceFilterGroup({
  filters,
  value,
  onChange,
  ariaLabel = 'Filter by price',
  sx,
}: {
  filters: CatalogPriceFilter[];
  value: string;
  onChange: (filterId: string) => void;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}) {
  if (filters.length === 0) return null;
  const selected = value || ALL;
  return (
    <Stack
      direction="row"
      justifyContent="center"
      flexWrap="wrap"
      sx={{ width: 'fit-content', maxWidth: '100%', mx: 'auto' }}
    >
      <ToggleButtonGroup
        exclusive
        value={selected}
        onChange={(_e, key: string | null) => {
          if (key == null) return;
          onChange(key === ALL ? '' : key);
        }}
        aria-label={ariaLabel}
        sx={sx}
      >
        <ToggleButton value={ALL}>All prices</ToggleButton>
        {filters.map((f) => (
          <ToggleButton key={f.id} value={f.id}>
            {f.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
