/**
 * Low-contrast ambient layer: gradient orbs, slow grid, fine noise. Admin main only.
 */
export function AdminAmbientBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-1/4 top-0 h-[min(70vh,520px)] w-[min(70vw,520px)] rounded-full bg-gradient-to-br from-amber-500/10 via-amber-200/5 to-transparent blur-3xl animate-admin-blob" />
      <div className="absolute -right-1/4 bottom-0 h-[min(60vh,480px)] w-[min(65vw,480px)] rounded-full bg-gradient-to-tl from-stone-500/8 via-amber-900/10 to-transparent blur-3xl animate-admin-blob-slow" />
      <div
        className="absolute inset-0 opacity-[0.035] animate-admin-grid"
        style={{
          backgroundImage: `linear-gradient(rgba(214,179,106,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(214,179,106,0.35) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute inset-0 bg-noise-fine opacity-[0.04] mix-blend-overlay" />
      <div className="absolute left-1/2 top-0 h-px w-[min(80%,720px)] -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-200/25 to-transparent" />
    </div>
  );
}
