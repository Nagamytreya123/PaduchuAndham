import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { IconDelete } from '../../icons';
import { resolveMediaUrl } from '../../utils/productImage';

const MAX_FILES = 15;

type AdminMultiImageUploadProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  /** Existing saved image URLs — shown as thumbnails in the edit dialog */
  existingUrls?: string[];
};

export function AdminMultiImageUpload({
  files,
  onChange,
  disabled = false,
  label = 'Upload image files',
  helperText = 'Select one or more images (JPEG, PNG, WebP). Uploaded files are added alongside URL images.',
  existingUrls = [],
}: AdminMultiImageUploadProps) {
  const remaining = MAX_FILES - files.length - existingUrls.length;

  return (
    <Stack spacing={1}>
      <Button variant="outlined" component="label" disabled={disabled || remaining <= 0} fullWidth sx={{ justifyContent: 'flex-start' }}>
        {label}
        <input
          type="file"
          hidden
          multiple
          accept="image/*"
          disabled={disabled || remaining <= 0}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length === 0) return;
            const room = MAX_FILES - files.length - existingUrls.length;
            onChange([...files, ...picked.slice(0, room)]);
            e.target.value = '';
          }}
        />
      </Button>
      <Typography variant="caption" color="text.secondary">
        {helperText}
        {files.length > 0 ? ` · ${files.length} new file${files.length === 1 ? '' : 's'} selected` : ''}
      </Typography>
      {existingUrls.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {existingUrls.map((url) => (
            <Box
              key={url}
              component="img"
              src={resolveMediaUrl(url)}
              alt=""
              sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
            />
          ))}
        </Stack>
      ) : null}
      {files.map((f, index) => (
        <Stack key={`${f.name}-${f.size}-${index}`} direction="row" alignItems="center" spacing={1}>
          <Box
            component="img"
            src={URL.createObjectURL(f)}
            alt=""
            sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
          />
          <Typography variant="body2" sx={{ flex: 1 }} noWrap>
            {f.name}
          </Typography>
          <IconButton
            size="small"
            aria-label={`Remove ${f.name}`}
            disabled={disabled}
            onClick={() => onChange(files.filter((_, i) => i !== index))}
          >
            <IconDelete fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}

export function appendFilesToFormData(fd: FormData, files: File[]) {
  for (const f of files) {
    fd.append('images', f);
  }
}
