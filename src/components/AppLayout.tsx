import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, ChevronLeft } from "lucide-react";
import FirstAccessBanner from "@/components/FirstAccessBanner";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
}

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  cliente: "Cliente",
  motorista: "Motorista",
  producao: "Produção",
};

const AppLayout = ({ children, title, subtitle, backTo, actions }: AppLayoutProps) => {
  const navigate = useNavigate();
  const { signOut, profile, role } = useAuth();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {backTo && (
              <button onClick={() => navigate(backTo)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-sm font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{profile?.nome}</p>
              <p className="text-[10px] text-muted-foreground">{role ? roleLabel[role] : ""}</p>
            </div>
            <button onClick={signOut} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="page-content animate-fade-in">
        <FirstAccessBanner />
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
