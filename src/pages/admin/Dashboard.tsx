import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ClipboardList, Shirt, AlertTriangle, Users, Package, TruckIcon } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, aguardando: 0, producao: 0, divergencias: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from("orders").select("status, has_divergence");
      const orders = data || [];
      setStats({
        total: orders.length,
        aguardando: orders.filter((o) => o.status === "aguardando_coleta").length,
        producao: orders.filter((o) => o.status === "em_lavagem").length,
        divergencias: orders.filter((o) => o.has_divergence).length,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Pedidos hoje", value: stats.total, color: "text-primary", icon: ClipboardList },
    { label: "Aguard. coleta", value: stats.aguardando, color: "text-warning", icon: TruckIcon },
    { label: "Na produção", value: stats.producao, color: "text-teal", icon: Package },
    { label: "Divergências", value: stats.divergencias, color: "text-destructive", icon: AlertTriangle },
  ];

  const menuItems = [
    { label: "Tipos de Roupa", desc: "Cadastro exclusivo admin", icon: Shirt, path: "/admin/roupas", badge: "badge-purple" },
    { label: "Todos os Pedidos", desc: "Visualizar e filtrar", icon: ClipboardList, path: "/admin/pedidos", badge: "badge-primary" },
    { label: "Gerenciar Usuários", desc: "Perfis e permissões", icon: Users, path: "/admin/pedidos", badge: "badge-teal" },
  ];

  return (
    <AppLayout title="Amaná" subtitle="Painel Administrativo">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <c.icon className={`w-5 h-5 mx-auto mb-2 ${c.color}`} />
            <div className={`stat-value ${c.color}`}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="list-item w-full text-left"
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
            <span className={item.badge}>→</span>
          </button>
        ))}
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
