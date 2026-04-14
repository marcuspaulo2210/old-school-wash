import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import ConfirmationModal from "@/components/ConfirmationModal";
import { Plus, X, Scale } from "lucide-react";

interface TipoRoupa { id: string; nome: string; }
interface ItemPedido { tipo_roupa_id: string; descricao_livre: string; quantidade_original: number; }
interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  criado_em: string;
  tipo_cobranca: string;
  rascunho: boolean;
  clientes: { tipo: string } | null;
}

interface UserPermissions {
  permite_cobranca_peca: boolean;
  permite_cobranca_peso: boolean;
}

const statusSteps = ["aguardando_coleta", "coletado", "em_producao", "embalado", "entregue"];
const stepLabels = ["Aguardar", "Coletado", "Produção", "Embalado", "Entregue"];

const ClienteDashboard = () => {
  const { user, profile } = useAuth();
  const [tiposRoupa, setTiposRoupa] = useState<TipoRoupa[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clienteInfo, setClienteInfo] = useState<{ tipo: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ pedido: string } | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({ permite_cobranca_peca: true, permite_cobranca_peso: true });

  // Tab state
  const [activeTab, setActiveTab] = useState<"peca" | "peso">("peca");

  // Weight fields
  const [pesoKg, setPesoKg] = useState("");
  const [weightItems, setWeightItems] = useState<{ tipo_roupa_id: string; quantidade: number }[]>([]);
  const [pesoError, setPesoError] = useState("");

  useEffect(() => {
    supabase.from("tipos_roupa").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setTiposRoupa((data as unknown as TipoRoupa[]) || []));

    if (user && profile?.cliente_id) {
      supabase.from("pedidos")
        .select("id, numero_pedido, status, criado_em, tipo_cobranca, rascunho, clientes(tipo)")
        .eq("cliente_id", profile.cliente_id)
        .order("criado_em", { ascending: false })
        .then(({ data }) => setOrders((data as unknown as Pedido[]) || []));

      supabase.from("clientes").select("tipo").eq("id", profile.cliente_id).single()
        .then(({ data }) => { if (data) setClienteInfo(data as any); });

      // Fetch user permissions
      supabase.from("usuarios").select("permite_cobranca_peca, permite_cobranca_peso").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            const p = data as unknown as UserPermissions;
            setPermissions(p);
            // Set default tab based on permissions
            if (p.permite_cobranca_peca) setActiveTab("peca");
            else if (p.permite_cobranca_peso) setActiveTab("peso");
          }
        });
    }
  }, [user, profile]);

  const isHospital = clienteInfo?.tipo === "hospital";
  const showBothTabs = permissions.permite_cobranca_peca && permissions.permite_cobranca_peso;
  const showOnlyPeca = permissions.permite_cobranca_peca && !permissions.permite_cobranca_peso;
  const showOnlyPeso = !permissions.permite_cobranca_peca && permissions.permite_cobranca_peso;

  const addItem = () => { if (!isHospital) setItems([...items, { tipo_roupa_id: "", descricao_livre: "", quantidade_original: 1 }]); };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemPedido, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const totalPieces = items.reduce((sum, i) => sum + i.quantidade_original, 0);

  const refreshOrders = async () => {
    if (!profile?.cliente_id) return;
    const { data } = await supabase.from("pedidos")
      .select("id, numero_pedido, status, criado_em, tipo_cobranca, rascunho, clientes(tipo)")
      .eq("cliente_id", profile.cliente_id)
      .order("criado_em", { ascending: false });
    setOrders((data as unknown as Pedido[]) || []);
  };

  const handleSubmitPecas = async (isDraft: boolean) => {
    if (!user || !profile?.cliente_id) return;
    if (!isHospital && items.length === 0) return;
    setSaving(true);
    const quemContou = isHospital ? "lavanderia" : "cliente";
    const { data: order, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: profile.cliente_id,
        tipo_cobranca: "peca",
        obs_cliente: notes || null,
        quem_contou: quemContou,
        rascunho: isDraft,
        status: isDraft ? "aguardando_coleta" : "aguardando_coleta",
      } as any)
      .select("id, numero_pedido")
      .single();

    if (order && !error) {
      const o = order as any;
      if (!isDraft) {
        await registrarMudancaStatus(o.id, null, "aguardando_coleta", user.id, "Pedido criado pelo cliente");
      }
      if (!isHospital && items.length > 0) {
        const orderItems = items.map((i) => ({ pedido_id: o.id, tipo_roupa_id: i.tipo_roupa_id || null, descricao_livre: i.descricao_livre || null, quantidade_original: i.quantidade_original, origem: "cliente" }));
        await supabase.from("itens_pedido").insert(orderItems as any);
      }
      setItems([]);
      setNotes("");
      setShowForm(false);
      if (!isDraft) setConfirmation({ pedido: o.numero_pedido });
      await refreshOrders();
    }
    setSaving(false);
  };

  const handleSubmitPeso = async (isDraft: boolean) => {
    if (!user || !profile?.cliente_id) return;
    if (!isDraft && !pesoKg) { setPesoError("Informe o peso das roupas."); return; }
    setPesoError("");
    setSaving(true);

    const { data: order, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: profile.cliente_id,
        tipo_cobranca: "peso",
        obs_cliente: notes || null,
        quem_contou: "cliente",
        peso_kg: pesoKg ? parseFloat(pesoKg) : null,
        peso_informado_cliente: pesoKg ? parseFloat(pesoKg) : null,
        rascunho: isDraft,
        status: isDraft ? "aguardando_coleta" : "aguardando_coleta",
      } as any)
      .select("id, numero_pedido")
      .single();

    if (order && !error) {
      const o = order as any;
      if (!isDraft) {
        await registrarMudancaStatus(o.id, null, "aguardando_coleta", user.id, "Pedido por peso criado pelo cliente");
      }
      // Save weight items if hospital
      if (isHospital && weightItems.some(wi => wi.quantidade > 0)) {
        const wItems = weightItems.filter(wi => wi.quantidade > 0).map(wi => ({
          pedido_id: o.id,
          tipo_roupa_id: wi.tipo_roupa_id,
          quantidade_original: wi.quantidade,
          origem: "cliente",
        }));
        await supabase.from("itens_pedido").insert(wItems as any);
      }

      setPesoKg("");
      setWeightItems([]);
      setNotes("");
      setShowForm(false);
      if (!isDraft) setConfirmation({ pedido: o.numero_pedido });
      await refreshOrders();
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (activeTab === "peso") {
      await handleSubmitPeso(false);
    } else {
      await handleSubmitPecas(false);
    }
  };

  const handleSaveDraft = async () => {
    if (activeTab === "peso") {
      await handleSubmitPeso(true);
    } else {
      await handleSubmitPecas(true);
    }
  };

  const latestOrder = orders.find(o => !o.rascunho);
  const currentStep = latestOrder ? statusSteps.indexOf(latestOrder.status) : -1;

  // Initialize weight items from tipos_roupa for hospital
  useEffect(() => {
    if (isHospital && tiposRoupa.length > 0 && weightItems.length === 0) {
      setWeightItems(tiposRoupa.map(tr => ({ tipo_roupa_id: tr.id, quantidade: 0 })));
    }
  }, [isHospital, tiposRoupa]);

  return (
    <AppLayout title="Amaná" subtitle={profile?.nome || "Cliente"}>
      {/* Progress tracker */}
      {latestOrder && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-4 mb-5">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
            Pedido <span className="font-mono" style={{ color: "#5b8df6" }}>{latestOrder.numero_pedido}</span>
          </p>
          <div className="flex items-center justify-between">
            {stepLabels.map((label, idx) => (
              <div key={label} className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  idx <= currentStep ? "text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`} style={idx <= currentStep ? { background: "#5b8df6" } : {}}>
                  {idx < currentStep ? "✓" : idx + 1}
                </div>
                <span className={`text-[10px] font-medium ${idx <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showForm ? (
        <button className="btn-primary w-full btn-lg mb-5" onClick={() => setShowForm(true)}>
          <Plus className="w-5 h-5" /> Novo Pedido
        </button>
      ) : (
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-5 mb-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Novo Pedido</h3>

          <div>
            <label className="field-label">Clínica / Hospital</label>
            <input className="field-input opacity-60" value={`${profile?.nome || ""} (${isHospital ? "Hospital" : "Clínica"})`} readOnly />
          </div>

          {/* Tabs */}
          {(showBothTabs || showOnlyPeca || showOnlyPeso) && (
            <div className="flex gap-2">
              {(showBothTabs || showOnlyPeca) && (
                <button
                  onClick={() => setActiveTab("peca")}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-[9px] transition-all"
                  style={{
                    background: activeTab === "peca" ? "#5b8df6" : "transparent",
                    color: activeTab === "peca" ? "#fff" : "#6b7190",
                    border: activeTab === "peca" ? "none" : "1px solid rgba(255,255,255,0.13)",
                  }}
                >
                  Por Peças
                </button>
              )}
              {(showBothTabs || showOnlyPeso) && (
                <button
                  onClick={() => setActiveTab("peso")}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-[9px] transition-all"
                  style={{
                    background: activeTab === "peso" ? "#5b8df6" : "transparent",
                    color: activeTab === "peso" ? "#fff" : "#6b7190",
                    border: activeTab === "peso" ? "none" : "1px solid rgba(255,255,255,0.13)",
                  }}
                >
                  Por Peso
                </button>
              )}
            </div>
          )}

          {/* Tab: Por Peças */}
          {activeTab === "peca" && (
            <>
              {isHospital ? (
                <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
                  ⚠ Hospital — peças serão cadastradas pela lavanderia após a coleta.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label mb-0">Peças</label>
                    <button className="btn-primary text-xs px-3 py-1.5" onClick={addItem}><Plus className="w-3 h-3" /> Adicionar</button>
                  </div>
                  {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça adicionada</p>}
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          className="field-input flex-1 text-xs py-2"
                          value={item.descricao_livre}
                          onChange={(e) => updateItem(idx, "descricao_livre", e.target.value)}
                          placeholder="Ex: Lençol, Toalha, Avental..."
                        />
                        <input
                          type="number"
                          className="field-input w-[68px] text-center font-mono font-bold text-xs py-2"
                          min={1}
                          value={item.quantidade_original}
                          onChange={(e) => updateItem(idx, "quantidade_original", parseInt(e.target.value) || 0)}
                        />
                        <button className="p-2 rounded-lg hover:bg-[rgba(224,80,80,0.12)] transition-colors" style={{ color: "#e05050" }} onClick={() => removeItem(idx)}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isHospital && items.length > 0 && (
                <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-[#0c0e14] border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Total de peças</span>
                  <span className="text-lg font-extrabold font-mono" style={{ color: "#34c97a" }}>{totalPieces}</span>
                </div>
              )}
            </>
          )}

          {/* Tab: Por Peso */}
          {activeTab === "peso" && (
            <>
              {isHospital && tiposRoupa.length > 0 && (
                <div className="space-y-2">
                  <label className="field-label">Tipos de roupa (opcional)</label>
                  {tiposRoupa.map((tr) => {
                    const wi = weightItems.find(w => w.tipo_roupa_id === tr.id);
                    return (
                      <div key={tr.id} className="flex items-center gap-3">
                        <span className="text-sm text-foreground flex-1">{tr.nome}</span>
                        <input
                          type="number"
                          className="field-input w-20 text-center font-mono text-xs py-1.5"
                          min={0}
                          value={wi?.quantidade || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setWeightItems(prev => prev.map(w => w.tipo_roupa_id === tr.id ? { ...w, quantidade: val } : w));
                          }}
                          placeholder="0"
                        />
                      </div>
                    );
                  })}
                  <div className="h-px bg-border my-2" />
                </div>
              )}

              <div>
                <label className="field-label flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Peso total a ser coletado *
                </label>
                <input
                  type="number"
                  step="0.001"
                  className="field-input font-mono"
                  value={pesoKg}
                  onChange={(e) => { setPesoKg(e.target.value); setPesoError(""); }}
                  placeholder="Digite o peso em kg (ex: 4.5)"
                />
                {pesoError && <p className="text-[11px] mt-1 text-destructive font-semibold">{pesoError}</p>}
              </div>

              {pesoKg && (
                <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-[#0c0e14] border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Peso informado</span>
                  <span className="text-lg font-extrabold font-mono" style={{ color: "#34c97a" }}>
                    {parseFloat(pesoKg).toFixed(3)} kg
                  </span>
                </div>
              )}
            </>
          )}

          <div>
            <label className="field-label">Observações</label>
            <textarea className="field-input min-h-[60px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Descrição das roupas, urgência, etc." />
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.13)", color: "#6b7190", background: "transparent" }}
              onClick={handleSaveDraft}
              disabled={saving}
            >
              Salvar rascunho
            </button>
            <button
              className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all text-white"
              style={{ background: "#5b8df6" }}
              onClick={handleSubmit}
              disabled={saving || (activeTab === "peca" && !isHospital && items.length === 0)}
            >
              {saving ? "Enviando..." : "Enviar Pedido"}
            </button>
          </div>

          <button className="btn-ghost w-full" onClick={() => { setShowForm(false); setItems([]); setPesoKg(""); }}>Cancelar</button>
        </div>
      )}

      {/* Order history */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico de pedidos</h3>
        {orders.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><p className="empty-state-text">Nenhum pedido ainda</p></div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.07)] bg-card">
                <div>
                  <span className="font-mono text-sm font-bold" style={{ color: "#5b8df6" }}>{order.numero_pedido}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.criado_em).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.rascunho && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase rounded-md" style={{ background: "rgba(107,113,144,0.15)", color: "#6b7190" }}>Rascunho</span>
                  )}
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant="info" title="Pedido Criado" onClose={() => setConfirmation(null)}>
          <div className="flex justify-between"><span>Status:</span><span className="text-foreground">Aguardando coleta</span></div>
          {activeTab === "peca" && !isHospital && <div className="flex justify-between"><span>Peças:</span><span className="text-foreground font-mono">{totalPieces}</span></div>}
          {activeTab === "peso" && pesoKg && <div className="flex justify-between"><span>Peso:</span><span className="text-foreground font-mono">{parseFloat(pesoKg).toFixed(3)} kg</span></div>}
        </ConfirmationModal>
      )}
    </AppLayout>
  );
};

export default ClienteDashboard;
