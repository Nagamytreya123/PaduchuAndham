import { useCallback, useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import {
  AdminPageHeader,
  DashboardCard,
  FloatingPanel,
  MetricCard,
  MotionButton,
  PageTransitionWrapper,
} from '../../components/admin/premium';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { staggerContainer, staggerItem } from '../../motion/variants';

const PAGE = 25;

type ReviewSummary = {
  total: number;
  averageRating: number | null;
  byRating: Record<'1' | '2' | '3' | '4' | '5', number>;
};

type AdminReviewRow = {
  id: string;
  rating: number;
  title?: string;
  body: string;
  reviewerName: string;
  createdAt: string;
  user: { email: string; name: string } | null;
  product: { id: string; name: string; category: string } | null;
  order: { id: string; status: string } | null;
};

export function AdminReviewsPage() {
  const reduced = useReducedMotion();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productFilterInput, setProductFilterInput] = useState('');
  const [productId, setProductId] = useState('');

  const loadFirstPage = useCallback(async () => {
    const q = new URLSearchParams();
    q.set('limit', String(PAGE));
    q.set('skip', '0');
    const pid = productId.trim();
    if (pid) q.set('productId', pid);
    return apiFetch<{
      summary: ReviewSummary;
      reviews: AdminReviewRow[];
      hasMore: boolean;
    }>(`/api/admin/reviews?${q.toString()}`);
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      setLoading(true);
      try {
        const data = await loadFirstPage();
        if (cancelled) return;
        setSummary(data.summary);
        setReviews(data.reviews);
        setHasMore(data.hasMore);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load reviews');
          setSummary(null);
          setReviews([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFirstPage]);

  async function handleLoadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set('limit', String(PAGE));
      q.set('skip', String(reviews.length));
      const pid = productId.trim();
      if (pid) q.set('productId', pid);
      const data = await apiFetch<{
        summary: ReviewSummary;
        reviews: AdminReviewRow[];
        hasMore: boolean;
      }>(`/api/admin/reviews?${q.toString()}`);
      setSummary(data.summary);
      setReviews((prev) => [...prev, ...data.reviews]);
      setHasMore(data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }

  function applyFilter() {
    setProductId(productFilterInput.trim());
  }

  function clearFilter() {
    setProductFilterInput('');
    setProductId('');
  }

  const maxBar = summary
    ? Math.max(1, ...[1, 2, 3, 4, 5].map((n) => summary.byRating[String(n) as keyof ReviewSummary['byRating']]))
    : 1;

  return (
    <PageTransitionWrapper>
      <Stack spacing={3}>
        <AdminPageHeader
          title="Reviews & ratings"
          description="Monitor customer feedback, star distribution, and jump to products or filter by product id."
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && !summary ? (
          <AdminLoadingPlaceholder variant="reviews" />
        ) : summary ? (
          <>
            <Grid
              container
              spacing={2.5}
              component={motion.div}
              variants={staggerContainer(0.08)}
              initial={reduced ? false : 'hidden'}
              animate="show"
            >
              <Grid item xs={12} sm={4} component={motion.div} variants={staggerItem}>
                <MetricCard label="Total reviews" value={summary.total} emphasize />
              </Grid>
              <Grid item xs={12} sm={4} component={motion.div} variants={staggerItem}>
                <DashboardCard float sx={{ p: 2.5, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Average rating
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
                    <Rating value={summary.averageRating ?? 0} precision={0.1} readOnly size="large" />
                    <Typography variant="h4" fontWeight={800} sx={{ fontFeatureSettings: '"tnum"' }}>
                      {summary.averageRating != null ? summary.averageRating.toFixed(1) : '—'}
                    </Typography>
                  </Stack>
                </DashboardCard>
              </Grid>
              <Grid item xs={12} sm={4} component={motion.div} variants={staggerItem}>
                <DashboardCard float sx={{ p: 2.5, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }} gutterBottom>
                    Star distribution
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    {[5, 4, 3, 2, 1].map((n) => {
                      const key = String(n) as keyof ReviewSummary['byRating'];
                      const c = summary.byRating[key];
                      return (
                        <Stack key={n} direction="row" alignItems="center" gap={1}>
                          <Typography variant="caption" sx={{ width: 28, fontWeight: 600 }}>
                            {n}★
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(c / maxBar) * 100}
                            sx={{
                              flex: 1,
                              height: 10,
                              borderRadius: 999,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': { borderRadius: 999 },
                            }}
                          />
                          <Typography variant="caption" sx={{ width: 32, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>
                            {c}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </DashboardCard>
              </Grid>
            </Grid>

            <FloatingPanel>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <TextField
                  size="small"
                  label="Filter by product id"
                  placeholder="24-char Mongo id"
                  value={productFilterInput}
                  onChange={(e) => setProductFilterInput(e.target.value)}
                  sx={{ flex: 1, maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <MotionButton variant="contained" onClick={() => applyFilter()}>
                  Apply
                </MotionButton>
                {productId ? (
                  <Button color="inherit" onClick={() => clearFilter()} sx={{ cursor: 'pointer' }}>
                    Clear
                  </Button>
                ) : null}
              </Stack>
              {productId ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Showing reviews for product <strong>{productId}</strong>
                </Typography>
              ) : null}
            </FloatingPanel>

            <Typography variant="subtitle1" fontWeight={700}>
              All reviews ({reviews.length}
              {hasMore ? '+' : ''})
            </Typography>

            <Stack spacing={1.75}>
              {reviews.length === 0 && !loading ? (
                <Typography color="text.secondary">No reviews yet.</Typography>
              ) : (
                reviews.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={reduced ? false : { opacity: 0, y: 22, filter: 'blur(6px)' }}
                    whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-12% 0px' }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <DashboardCard sx={{ p: 2.5 }}>
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          gap={1}
                        >
                          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                            <Rating value={r.rating} readOnly size="small" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(r.createdAt).toLocaleString()}
                            </Typography>
                          </Stack>
                          <Stack direction="row" gap={0.5} flexWrap="wrap">
                            {r.product && (
                              <Chip
                                size="small"
                                label={r.product.category || 'Product'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Stack>
                        </Stack>

                        {r.product && (
                          <Typography variant="body1" fontWeight={700}>
                            <Link component={RouterLink} to={`/products/${r.product.id}`} underline="hover">
                              {r.product.name}
                            </Link>
                          </Typography>
                        )}

                        {r.title && (
                          <Typography variant="subtitle2" fontWeight={700}>
                            {r.title}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {r.body}
                        </Typography>

                        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            By {r.reviewerName}
                            {r.user?.email ? ` · ${r.user.email}` : ''}
                          </Typography>
                          {r.order && (
                            <Typography variant="caption" color="text.secondary">
                              Order #{r.order.id.slice(-8)} · {r.order.status}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </DashboardCard>
                  </motion.div>
                ))
              )}
            </Stack>

            {hasMore && (
              <MotionButton variant="outlined" onClick={() => void handleLoadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </MotionButton>
            )}
          </>
        ) : null}
      </Stack>
    </PageTransitionWrapper>
  );
}
