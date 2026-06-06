import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutGrid,
  ClipboardList,
  AlertTriangle,
  Shirt,
  ListChecks,
  Users,
  MapPin,
  LogOut,
  Menu,
  X,
  CalendarDays,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const menuCategories = [
  {
    label: "Operação",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutGrid },
      { label: "Pedidos", path: "/admin/pedidos", icon: ClipboardList },
      { label: "Divergências", path: "/admin/divergencias", icon: AlertTriangle },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { label: "Acessos", path: "/admin/acessos", icon: Users },
      { label: "Tipos de Roupa", path: "/admin/roupas", icon: Shirt },
      { label: "Serviços", path: "/admin/servicos", icon: ListChecks },
      { label: "Rotas", path: "/admin/rotas", icon: MapPin },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Preços", path: "/admin/precos", icon: DollarSign },
      { label: "Relatórios", path: "/admin/relatorios", icon: BarChart3 },
      { label: "Análise Mensal", path: "/admin/analise", icon: TrendingUp },
    ],
  },
];

const AdminLayout = ({ children, title, subtitle, actions }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.nome
    ? profile.nome
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-sm font-extrabold text-foreground tracking-tight">Amaná</h1>
        <p className="text-[11px] text-muted-foreground font-medium">Lavanderia Hospitalar</p>
      </div>

      <div className="h-px mx-4" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {menuCategories.map((cat) => (
          <div key={cat.label}>
            <p
              className="px-2 mb-1.5 font-semibold uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.7px", color: "#4b5170" }}
            >
              {cat.label}
            </p>
            <div className="space-y-0.5">
              {cat.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
                    style={{
                      background: active ? "rgba(91,141,246,0.12)" : "transparent",
                      color: active ? "#5b8df6" : "#6b7190",
                      borderLeft: active ? "3px solid #5b8df6" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "#1a1e2a";
                        e.currentTarget.style.color = "#eceef4";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#6b7190";
                      }
                    }}
                  >
                    <item.icon style={{ width: 15, height: 15 }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="h-px mx-4" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Footer */}
      <div className="p-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #5b8df6, #9b72f4)" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{profile?.nome || "Admin"}</p>
          <p className="text-[11px] text-muted-foreground">Administrador</p>
        </div>
        <button
          onClick={signOut}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Sair"
        >
          <LogOut style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40"
        style={{ width: 220, background: "#0f1117", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 md:hidden transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: 260, background: "#0f1117" }}
      >
        <div className="flex justify-end p-3">
          <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-[220px] min-h-screen flex flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "hsla(225,24%,10%,0.85)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
