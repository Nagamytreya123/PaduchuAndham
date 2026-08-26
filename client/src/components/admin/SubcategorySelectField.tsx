import { useEffect, useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { apiFetch } from '../../api/client';
import { useCategories } from '../../context/CategoriesContext';

const ADD_NEW = '__new__';
const NONE = '';

export function SubcategorySelectField({
  categorySlug,
  value,
  onChange,
  disabled,
}: {
  categorySlug: string;
  value: string;
  onChange: (subcategory: string) => void;
  disabled?: boolean;
}) {
  const { categories, refresh } = useCategories();
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    const cat = categories.find((c) => c.slug === categorySlug);
    return cat?.subcategories ?? [];
  }, [categories, categorySlug]);

  useEffect(() => {
    setMode('pick');
    setNewLabel('');
    setError(null);
  }, [categorySlug]);

  const displayOptions = useMemo(() => {
    const list = [...options];
    const trimmed = value.trim();
    if (trimmed && !list.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      list.push(trimmed);
    }
    return list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [options, value]);

  const selectValue = mode === 'create' ? ADD_NEW : value || NONE;

  async function createSubcategory() {
    setError(null);
    const label = newLabel.trim();
    if (label.length < 2) {
      setError('Enter a subcategory name');
      return;
    }
    if (!categorySlug) {
      setError('Pick a category first');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/admin/categories/${encodeURIComponent(categorySlug)}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      await refresh();
      onChange(label);
      setMode('pick');
      setNewLabel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add subcategory');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <TextField
        select
        label="Subcategory"
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === ADD_NEW) {
            setMode('create');
            setError(null);
            return;
          }
          setMode('pick');
          onChange(next === NONE ? '' : next);
        }}
        fullWidth
        disabled={disabled || saving || !categorySlug}
        helperText={
          !categorySlug ? 'Select a category first' : 'Optional — used for shop filters and product grouping'
        }
      >
        <MenuItem value={NONE}>
          <em>None</em>
        </MenuItem>
        {displayOptions.map((sub) => (
          <MenuItem key={sub} value={sub}>
            {sub}
          </MenuItem>
        ))}
        <MenuItem value={ADD_NEW}>Add new subcategory…</MenuItem>
      </TextField>
      {mode === 'create' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
          <TextField
            label="New subcategory name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            fullWidth
            required
            disabled={disabled || saving}
            error={Boolean(error)}
            helperText={error ?? 'e.g. Dress, Chain, Bangle'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void createSubcategory();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={() => void createSubcategory()}
            disabled={disabled || saving || newLabel.trim().length < 2}
            sx={{ flexShrink: 0, mt: { sm: 0.5 } }}
          >
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
