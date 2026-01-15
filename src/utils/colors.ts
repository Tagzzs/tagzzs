// Tag color styles for consistent coloring
const TAG_STYLES = [
  'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'
];

export function getTagColor(tag: string): string {
  // Simple hash to assign consistent color to same tag name
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_STYLES[Math.abs(hash) % TAG_STYLES.length];
}

export function getModalTagColor(tag: string): string {
  const baseColor = getTagColor(tag);
  // Use slightly larger badge for modal
  return baseColor;
}
