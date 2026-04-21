import { Check } from "lucide-react";

export interface ProgressStep {
  key: string;
  label: string;
  color: string;
  timestamp?: string | null;
}

const defaultColors = ["#9b72f4", "#f0a020", "#5b8df6", "#2dbfa0", "#34c97a"];

interface OrderProgressProps {
  steps: ProgressStep[];
  currentIndex: number;
  numeroPedido?: string;
}

const OrderProgress = ({ steps, currentIndex, numeroPedido }: OrderProgressProps) => {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-4">
      {numeroPedido && (
        <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
          Pedido <span className="font-mono" style={{ color: "#5b8df6" }}>{numeroPedido}</span>
        </p>
      )}
      <div className="flex items-start justify-between gap-1">
        {steps.map((step, idx) => {
          const done = idx <= currentIndex;
          const color = step.color || defaultColors[idx] || "#6b7190";
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-all"
                style={{
                  background: done ? color : "transparent",
                  border: done ? "none" : "1.5px solid rgba(255,255,255,0.13)",
                  color: done ? "#fff" : "#6b7190",
                }}
              >
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
              </div>
              <span
                className="text-[10px] font-semibold text-center leading-tight px-0.5"
                style={{ color: done ? "#fff" : "#6b7190" }}
              >
                {step.label}
              </span>
              {step.timestamp && (
                <span className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                  {new Date(step.timestamp).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderProgress;
