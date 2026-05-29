import IconButton from '@mui/material/IconButton';
import type { SxProps, Theme } from '@mui/material/styles';
import { IconHeart, IconHeartFilled } from '../icons';
import { useWishlist, type WishlistItem } from '../context/WishlistContext';

type WishlistToggleButtonProps = {
  item: WishlistItem;
  /** Glass pill on product imagery */
  variant?: 'default' | 'overlay';
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
};

export function WishlistToggleButton({
  item,
  variant = 'default',
  size = 'small',
  sx,
}: WishlistToggleButtonProps) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(item.id);

  return (
    <IconButton
      size={size}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      sx={[
        variant === 'overlay' && {
          bgcolor: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(8px)',
          color: saved ? '#ba1a1a' : '#1b1b1b',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.95)' },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {saved ? <IconHeartFilled fontSize="small" /> : <IconHeart fontSize="small" />}
    </IconButton>
  );
}
