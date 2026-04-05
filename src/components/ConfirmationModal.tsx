import { ReactNode } from "react";

interface ConfirmationModalProps {
  numeroPedido: string;
  variant: "info" | "success" | "danger";
  title: string;
  children?: ReactNode;
  onClose: () => void;
}

const variantColor = {
  info: "#5b8df6",
  success: "#34c97a",
  danger: "#e05050",
};

const ConfirmationModal = ({ numeroPedido, variant, title, children, onClose }: ConfirmationModalProps) => {
  const color = variantColor[variant];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-6 w-full max-w-sm text-center space-y-4 animate-fade-in">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-extrabold font-mono" style={{ color }}>{numeroPedido}</p>
        {children && <div className="text-sm text-muted-foreground space-y-1 text-left">{children}</div>}
        <button
          className="w-full inline-flex items-center justify-center gap-2 font-semibold text-sm px-5 py-3 rounded-lg transition-all active:scale-[0.97]"
          style={{ background: color, color: "#fff" }}
          onClick={onClose}
        >
          Ok, fechar
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;
