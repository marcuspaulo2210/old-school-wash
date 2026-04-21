import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, X, CheckCheck } from "lucide-react";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notificacoes")
      .select("id, tipo, titulo, mensagem, lida, criado_em")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(20);
    setItems((data as unknown as Notificacao[]) || []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((i) => !i.lida).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    load();
  };

  const tipoColor = (tipo: string) => {
    if (tipo === "alerta") return "#f0a020";
    if (tipo === "sucesso") return "#34c97a";
    return "#5b8df6";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Notificações"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "#e05050" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.13)] bg-card shadow-xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
              <span className="text-sm font-bold text-foreground">Notificações</span>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded"
                  >
                    <CheckCheck className="w-3 h-3" /> Marcar lidas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem notificações</p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-3"
                    style={{ background: n.lida ? "transparent" : "rgba(91,141,246,0.05)" }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: tipoColor(n.tipo) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{n.titulo}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {new Date(n.criado_em).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
