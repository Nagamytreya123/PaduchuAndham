import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Rating from '@mui/material/Rating';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ProductReview, ReviewSummary, ViewerReviewEligibility } from '../types/product';

const PAGE = 20;

type ReviewsApiResponse = {
  summary: ReviewSummary;
  reviews: ProductReview[];
  total: number;
  hasMore: boolean;
  viewer: ViewerReviewEligibility | null;
};

type Props = {
  productId: string;
};

export function ProductReviewsSection({ productId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [viewer, setViewer] = useState<ViewerReviewEligibility | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (skip: number) => {
      return apiFetch<ReviewsApiResponse>(
        `/api/products/${productId}/reviews?limit=${PAGE}&skip=${skip}`,
      );
    },
    [productId],
  );

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchPage(0);
        if (cancelled) return;
        setSummary(data.summary);
        setReviews(data.reviews);
        setViewer(data.viewer);
        setHasMore(data.hasMore);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load reviews');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, user?.id, authLoading, fetchPage]);

  async function handleLoadMore() {
    setLoadingMore(true);
    setLoadError(null);
    try {
      const data = await fetchPage(reviews.length);
      setReviews((prev) => [...prev, ...data.reviews]);
      setSummary(data.summary);
      setViewer(data.viewer);
      setHasMore(data.hasMore);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load more');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      setTitle('');
      setBody('');
      setRating(5);
      const data = await fetchPage(0);
      setSummary(data.summary);
      setReviews(data.reviews);
      setViewer(data.viewer);
      setHasMore(data.hasMore);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/login?redirect=${encodeURIComponent(`/products/${productId}`)}`;

  if (authLoading || loading) {
    return (
      <Box sx={{ py: 1 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} />
      </Box>
    );
  }

  if (loadError && !summary) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const count = summary?.reviewCount ?? 0;
  const avg = summary?.averageRating;

  return (
    <Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
        Ratings & reviews
      </Typography>

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
        <Rating value={avg ?? 0} precision={0.1} readOnly size="large" />
        <Typography variant="body1" color="text.secondary">
          {avg != null ? avg.toFixed(1) : '—'} · {count} {count === 1 ? 'review' : 'reviews'}
        </Typography>
      </Stack>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {!user && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Link component={RouterLink} to={loginHref}>
            Sign in
          </Link>{' '}
          to see whether you can leave a review. Reviews unlock after your order for this item is
          delivered.
        </Alert>
      )}

      {user && viewer && !viewer.delivered && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You can write a review after your order for this product has been{' '}
          <strong>delivered</strong>. We will enable ratings here once fulfilment marks your order as
          delivered.
        </Alert>
      )}

      {user && viewer?.alreadyReviewed && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Thanks — you have already reviewed this product.
        </Alert>
      )}

      {user && viewer?.canSubmit && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, borderRadius: 2 }}
          component="form"
          onSubmit={handleSubmit}
        >
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Write a review
          </Typography>
          {submitError && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {submitError}
            </Alert>
          )}
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Your rating
              </Typography>
              <Rating
                value={rating}
                onChange={(_, v) => setRating(v ?? 5)}
                size="large"
              />
            </Stack>
            <TextField
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              inputProps={{ maxLength: 200 }}
              fullWidth
              size="small"
            />
            <TextField
              label="Review"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              multiline
              minRows={4}
              fullWidth
              helperText="At least 10 characters"
            />
            <Button type="submit" variant="contained" disabled={submitting || body.trim().length < 10}>
              {submitting ? 'Submitting…' : 'Submit review'}
            </Button>
          </Stack>
        </Paper>
      )}

      <Stack spacing={2}>
        {reviews.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No reviews yet.
          </Typography>
        )}
        {reviews.map((r) => (
          <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                gap={1}
              >
                <Rating value={r.rating} readOnly size="small" />
                <Typography variant="caption" color="text.secondary">
                  {r.reviewerName || 'Customer'} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Typography>
              </Stack>
              {r.title && (
                <Typography variant="subtitle2" fontWeight={700}>
                  {r.title}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {r.body}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {hasMore && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => void handleLoadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
