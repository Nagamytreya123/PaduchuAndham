import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { SxProps, Theme } from '@mui/material/styles';

const ALL = 'all';

export function SubcategoryFilterGroup({
  subcategories,
  value,
  onChange,
  ariaLabel = 'Filter by subcategory',
  sx,
}: {
  subcategories: string[];
  value: string;
  onChange: (subcategory: string) => void;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}) {
  if (subcategories.length === 0) return null;
  const selected = value || ALL;
  return (
    <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ width: '100%' }}>
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
        <ToggleButton value={ALL}>All types</ToggleButton>
        {subcategories.map((sub) => (
          <ToggleButton key={sub} value={sub}>
            {sub}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
