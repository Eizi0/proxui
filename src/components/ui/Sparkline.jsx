// Mini graphique en aire, pour les cartes de ressources (CPU/RAM/réseau...).
// `points` : tableau de nombres 0..1. Pas de dépendance externe (charting
// lib) pour rester léger — suffisant pour une tendance sur ~1h.

export default function Sparkline({ points = [], color = '#f26522', height = 44 }) {
  const w = 220;
  const h = height;
  if (!points.length) {
    return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} />;
  }
  const max = Math.max(...points, 0.01);
  const step = w / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => `${i * step},${h - (p / max) * (h - 6) - 2}`);
  const line = coords.join(' ');
  const fill = `0,${h} ${line} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" />
      <polygon points={fill} fill={color} opacity="0.12" />
    </svg>
  );
}
