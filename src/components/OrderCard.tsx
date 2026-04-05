import { ReactNode } from "react";
import StatusBadge from "./StatusBadge";
import { MessageSquare } from "lucide-react";

interface OrderCardProps {
  numeroPedido: string;
  clienteNome: string;
  resumo?: string;
  status: string;
  criadoEm?: string;
  obsCliente?: string | null;
  action?: ReactNode;
  onClick?: () => void;
}

const OrderCard = ({ numeroPedido, clienteNome, resumo, status, criadoEm, obsCliente, action, onClick }: OrderCardProps) => {
  return (
    <button
      className="w-full text-left rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-4 transition-all hover:bg-[#1a1e2a] hover:border-[rgba(255,255,255,0.13)] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-sm font-bold" style={{ color: "#5b8df6" }}>
            {numeroPedido}
          </span>
          <p className="text-sm font-bold text-foreground mt-0.5 truncate">{clienteNome}</p>
          {resumo && <p className="text-xs text-muted-foreground mt-0.5 truncate">{resumo}</p>}
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-muted-foreground font-mono">
          {criadoEm ? new Date(criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
        <div className="flex items-center gap-2">
          {obsCliente && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
              <MessageSquare className="w-3 h-3" /> obs
            </span>
          )}
          {action}
        </div>
      </div>
    </button>
  );
};

export default OrderCard;
