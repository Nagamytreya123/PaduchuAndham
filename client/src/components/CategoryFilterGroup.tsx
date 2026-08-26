import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  collectionFilterOptions,
  type CollectionFilterKey,
  type CatalogCategory,
} from '../utils/catalogCategory';

export function CategoryFilterGroup({
  categories,
  value,
  onChange,
  orientation = 'horizontal',
  fullWidth,
  ariaLabel = 'Filter by category',
  sx,
}: {
  categories: CatalogCategory[];
  value: CollectionFilterKey;
  onChange: (key: CollectionFilterKey) => void;
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}) {
  const options = collectionFilterOptions(categories);
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      orientation={orientation}
      fullWidth={fullWidth}
      onChange={(_e, key: CollectionFilterKey | null) => {
        if (key == null) return;
        onChange(key);
      }}
      aria-label={ariaLabel}
      sx={sx}
    >
      {options.map((opt) => (
        <ToggleButton key={opt.key} value={opt.key}>
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
