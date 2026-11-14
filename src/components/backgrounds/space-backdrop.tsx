/**
 * The CSS night sky behind every page: pin-point stars, two soft nebulae and,
 * on content pages, faint gold threads. No WebGL, so it never spends a context.
 */
export function SpaceBackdrop({ threads = false }: { threads?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="stars" />
      <div className="nebula" />
      {threads ? <div className="threads-bg" /> : null}
    </div>
  );
}
