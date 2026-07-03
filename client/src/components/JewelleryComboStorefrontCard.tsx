import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { motion } from 'framer-motion';
import type { JewelleryComboSummary } from '../types/jewelleryCombo';
import { COMBO_CATEGORY_TILE_IMAGE } from '../constants/categoryTileImages';
import { shopSurface } from '../constants/shopSurface';
import { formatInrFromPaise } from '../utils/format';
import { handleProductImageError, resolveMediaUrl } from '../utils/productImage';
import { EditorialImageFrame } from './EditorialImageFrame';
import { WishlistToggleButton } from './WishlistToggleButton';
import { comboToWishlistItem } from '../context/WishlistContext';

type Variant = 'dark' | 'light';

export function JewelleryComboStorefrontCard({
  combo,
  index,
  variant = 'dark',
  imageFrame = 'default',
}: {
  combo: JewelleryComboSummary;
  index: number;
  variant?: Variant;
  imageFrame?: 'default' | 'editorial';
}) {
  const thumb = combo.images[0];
  const isLight = variant === 'light';
  const isEditorial = imageFrame === 'editorial';
  const imageSrc = resolveMediaUrl(thumb) || COMBO_CATEGORY_TILE_IMAGE;

  return (
    <Grid
      item
      xs={isEditorial || !isLight ? 12 : 6}
      sm={isEditorial ? 6 : isLight ? 4 : 6}
      md={isEditorial ? 4 : isLight ? 3 : 4}
      lg={isEditorial ? 4 : isLight ? 3 : 3}
    >
      <motion.div
        initial={{ opacity: 0, y: isLight ? 16 : 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: isLight ? 0.45 : 0.8, delay: index * 0.08 }}
      >
        <Box
          sx={{
            transition: 'transform 0.4s ease, box-shadow 0.4s ease',
            '&:hover': {
              transform: 'translateY(-6px)',
              boxShadow: isLight
                ? '0 8px 24px rgba(20, 34, 26, 0.08)'
                : '0 15px 30px rgba(214, 179, 106, 0.1)',
            },
          }}
        >
          <Card
            elevation={0}
            sx={{
              bgcolor: isEditorial ? 'transparent' : isLight ? 'rgba(255,255,255,0.7)' : '#141415',
              border: isEditorial
                ? 'none'
                : isLight
                  ? '1px solid rgba(26, 26, 26, 0.08)'
                  : '1px solid rgba(214, 179, 106, 0.2)',
              borderRadius: isEditorial ? 0 : isLight ? 1 : 2,
              overflow: isEditorial ? 'visible' : 'hidden',
            }}
          >
            <CardActionArea component={RouterLink} to={`/jewellery-combos/${combo.id}`}>
              <Box sx={{ position: 'relative' }}>
                {isEditorial ? (
                  <EditorialImageFrame src={imageSrc} alt={combo.name} inset />
                ) : (
                  <CardMedia
                    component={thumb ? 'img' : 'div'}
                    image={imageSrc}
                    onError={thumb ? handleProductImageError : undefined}
                    sx={{
                      aspectRatio: '4/3',
                      objectFit: 'cover',
                      bgcolor: isLight ? '#e8e2d8' : 'rgba(255,255,255,0.04)',
                      minHeight: isLight ? 140 : 200,
                    }}
                  />
                )}
                <WishlistToggleButton
                  item={comboToWishlistItem(combo)}
                  variant="overlay"
                  sx={{
                    position: 'absolute',
                    top: isEditorial ? { xs: 12, sm: 16 } : 8,
                    right: isEditorial ? { xs: 'calc(4% + 8px)', sm: 'calc(4% + 12px)' } : 8,
                    zIndex: 2,
                  }}
                />
              </Box>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: isLight ? shopSurface.ink : '#F5F5F5',
                    mb: 0.5,
                  }}
                  noWrap
                >
                  {combo.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isLight ? shopSurface.ink : '#D6B36A',
                    fontWeight: 700,
                  }}
                >
                  {formatInrFromPaise(combo.price)}
                </Typography>
                <Typography variant="caption" sx={{ color: isLight ? shopSurface.inkMuted : '#8A8175' }}>
                  {combo.productIds.length} pieces · View set
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      </motion.div>
    </Grid>
  );
}
