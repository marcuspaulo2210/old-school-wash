import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { getStatusConfig } from "@/components/StatusBadge";
import { ClipboardList, Shirt, AlertTriangle, Users, Package, TruckIcon } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, aguardando: 0, producao: 0, divergencias: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from("pedidos").select("status");
      const orders = data || [];
      setStats({
        total: orders.length,
        aguardando: orders.filter((o) => o.status === "aguardando_coleta").length,
        producao: orders.filter((o) => o.status === "em_producao").length,
        divergencias: orders.filter((o) => o.status === "divergencia").length,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Pedidos hoje", value: stats.total, statusKey: "em_producao", icon: ClipboardList, desc: "Total de pedidos" },
    { label: "Aguard. coleta", value: stats.aguardando, statusKey: "aguardando_coleta", icon: TruckIcon, desc: "Esperando motorista" },
    { label: "Na produção", value: stats.producao, statusKey: "em_producao", icon: Package, desc: "Em processamento" },
    { label: "Divergências", value: stats.divergencias, statusKey: "divergencia", icon: AlertTriangle, desc: "Requer atenção" },
  ];

  const menuItems = [
    { label: "Tipos de Roupa", desc: "Cadastro exclusivo admin", icon: Shirt, path: "/admin/roupas", statusKey: "aguardando_coleta" },
    { label: "Todos os Pedidos", desc: "Visualizar e filtrar", icon: ClipboardList, path: "/admin/pedidos", statusKey: "em_producao" },
    { label: "Gerenciar Usuários", desc: "Perfis e permissões", icon: Users, path: "/admin/pedidos", statusKey: "embalado" },
  ];

  return (
    <AppLayout title="Amaná" subtitle="Painel Administrativo">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => {
          const cfg = getStatusConfig(c.statusKey);
          return (
            <div key={c.label} className="rounded-xl p-4 bg-card border border-[rgba(255,255,255,0.07)] relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-extrabold font-mono mt-1" style={{ color: cfg.color }}>{c.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c.desc}</p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <c.icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => {
          const cfg = getStatusConfig(item.statusKey);
          return (
            <button
              key={item.label}
              className="flex items-center justify-between w-full text-left p-4 rounded-xl border border-[rgba(255,255,255,0.07)] bg-card transition-all hover:bg-[#1a1e2a] hover:border-[rgba(255,255,255,0.13)]"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <item.icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
              <span className="text-muted-foreground">→</span>
            </button>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
