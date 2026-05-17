import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const FirstAccessBanner = () => {
  const { profile } = useAuth();

  if (!profile?.primeiro_acesso) return null;

  return (
    <section className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-warning/15 p-2 text-warning">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Defina sua senha pessoal quando quiser.</p>
            <p className="text-xs text-muted-foreground">Seu acesso ao sistema continua liberado enquanto isso.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/primeiro-acesso">Criar senha pessoal</Link>
        </Button>
      </div>
    </section>
  );
};

export default FirstAccessBanner;