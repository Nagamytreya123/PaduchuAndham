import { useState } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { apiFetch } from '../../api/client';
import { useCategories } from '../../context/CategoriesContext';
import type { CatalogCategory } from '../../utils/catalogCategory';

const ADD_NEW = '__new__';

export function CategorySelectField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
}) {
  const { categories, refresh } = useCategories();
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectValue = mode === 'create' ? ADD_NEW : value;

  async function createCategory() {
    setError(null);
    const label = newLabel.trim();
    if (label.length < 2) {
      setError('Enter a category name');
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<{ category: CatalogCategory }>('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      await refresh();
      onChange(data.category.slug);
      setMode('pick');
      setNewLabel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <TextField
        select
        label="Category"
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === ADD_NEW) {
            setMode('create');
            setError(null);
            return;
          }
          setMode('pick');
          onChange(next);
        }}
        fullWidth
        disabled={disabled || saving}
      >
        {categories.map((c) => (
          <MenuItem key={c.slug} value={c.slug}>
            {c.label}
          </MenuItem>
        ))}
        <MenuItem value={ADD_NEW}>Add new category…</MenuItem>
      </TextField>
      {mode === 'create' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
          <TextField
            label="New category name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            fullWidth
            required
            disabled={disabled || saving}
            error={Boolean(error)}
            helperText={error ?? 'This appears in shop filters for everyone.'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void createCategory();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={() => void createCategory()}
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
