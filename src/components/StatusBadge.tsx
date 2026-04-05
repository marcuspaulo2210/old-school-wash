const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_coleta: { label: "Aguard. Coleta", color: "#9b72f4", bg: "rgba(155,114,244,0.12)" },
  coletado:          { label: "Coletado",       color: "#f0a020", bg: "rgba(240,160,32,0.12)" },
  em_producao:       { label: "Em Produção",    color: "#5b8df6", bg: "rgba(91,141,246,0.12)" },
  embalado:          { label: "Embalado",       color: "#34c97a", bg: "rgba(52,201,122,0.12)" },
  entregue:          { label: "Entregue",       color: "#6b7190", bg: "rgba(107,113,144,0.12)" },
  divergencia:       { label: "Divergência",    color: "#e05050", bg: "rgba(224,80,80,0.12)" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const getStatusConfig = (status: string) =>
  statusConfig[status] || { label: status, color: "#6b7190", bg: "rgba(107,113,144,0.12)" };

const StatusBadge = ({ status, className = "" }: StatusBadgeProps) => {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md ${className}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
