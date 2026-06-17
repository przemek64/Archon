/**
 * Renders a small visual marker identifying which frontend instance this is.
 * Driven by VITE_INSTANCE_LABEL / VITE_INSTANCE_COLOR (set per start script).
 * Renders nothing when no label is configured, so production builds stay clean.
 */
export function InstanceBadge(): React.ReactElement | null {
  const label = import.meta.env.VITE_INSTANCE_LABEL as string | undefined;
  const color = (import.meta.env.VITE_INSTANCE_COLOR as string | undefined) || '#2563eb';

  if (!label) return null;

  return (
    <>
      {/* Colored strip across the very top of the viewport */}
      <div
        style={{ backgroundColor: color }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1"
      />
      {/* Corner pill with the instance name */}
      <div
        style={{ backgroundColor: color }}
        className="pointer-events-none fixed bottom-3 right-3 z-[9999] rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg"
      >
        {label}
      </div>
    </>
  );
}
