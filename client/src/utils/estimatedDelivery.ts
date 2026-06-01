/** Business-day estimate shown on order success (5–7 days from payment). */
export function formatEstimatedDelivery(from = new Date()): string {
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${fmt(addDays(from, 5))} – ${fmt(addDays(from, 7))}`;
}
