// Pastille de statut réutilisée partout (tableau de bord, listes, détail VM/hôte).
// `status` accepte les valeurs natives de l'API Proxmox (running, stopped,
// paused, online, offline...) et quelques statuts applicatifs (migrating).

const STATUS_MAP = {
  running: { label: 'En cours', variant: 'pill-running', dot: '#4ee296' },
  online: { label: 'En ligne', variant: 'pill-running', dot: '#4ee296' },
  stopped: { label: 'Arrêtée', variant: 'pill-stopped', dot: '#9499a6' },
  offline: { label: 'Hors ligne', variant: 'pill-danger', dot: '#f87171' },
  paused: { label: 'Pause', variant: 'pill-warning', dot: '#f2a35a' },
  migrating: { label: 'Migration', variant: 'pill-info', dot: '#5ab0ff' },
  warning: { label: 'Attention', variant: 'pill-warning', dot: '#f2a35a' },
  unknown: { label: 'Inconnu', variant: 'pill-stopped', dot: '#9499a6' },
};

export default function StatusPill({ status, label }) {
  const entry = STATUS_MAP[status] || STATUS_MAP.unknown;
  return (
    <span className={`pill ${entry.variant}`}>
      <span className="pill-dot" style={{ background: entry.dot }} />
      {label || entry.label}
    </span>
  );
}
