import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import ConfirmationModal from "@/components/ConfirmationModal";
import OrderProgress, { ProgressStep } from "@/components/OrderProgress";
import OrderTimeline from "@/components/OrderTimeline";
import ClienteSaldoRoupas from "@/components/ClienteSaldoRoupas";
import NotificationBell from "@/components/NotificationBell";
import { Plus, X, Scale, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { calcDataColeta, formatDataColeta, toIsoDate, RotaLite } from "@/lib/coletaDate";

interface TipoRoupa { id: string; nome: string; }
interface ItemPedido { tipo_roupa_id: string; descricao_livre: string; quantidade_original: number; }
interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  criado_em: string;
  tipo_cobranca: string;
  rascunho: boolean;
  coletado_em: string | null;
  embalado_em: string | null;
  pronto_em: string | null;
  saiu_em: string | null;
  entregue_em: string | null;
  peso_informado_cliente: number | null;
  peso_kg: number | null;
  peso_motorista_kg: number | null;
  clientes: { tipo: string } | null;
}

interface UserPermissions {
  permite_cobranca_peca: boolean;
  permite_cobranca_peso: boolean;
}

interface HospitalQty { tipo_roupa_id: string; quantidade: number; }

interface ClienteFull {
  tipo: string;
  rota_id: string | null;
  motorista_id?: string | null;
}
interface RotaInfo extends RotaLite {
  id: string;
  motorista_id: string | null;
}

const buildSteps = (p: Pedido): ProgressStep[] => {
  const order = ["aguardando_coleta", "coletado", "em_producao", "pronto_para_entrega", "saiu_para_entrega", "entregue"];
  const idx = order.indexOf(p.status);
  return [
    { key: "aguardando", label: "Aguardando coleta", color: "#9b72f4", timestamp: p.criado_em },
    { key: "coletado", label: "Coletado", color: "#f0a020", timestamp: p.coletado_em },
    { key: "producao", label: "Na produção", color: "#5b8df6", timestamp: idx >= 2 ? p.coletado_em : null },
    { key: "finalizado", label: "Finalizado", color: "#2dbfa0", timestamp: p.pronto_em || p.embalado_em },
    { key: "entrega", label: "Saiu p/ entrega", color: "#34c97a", timestamp: p.saiu_em || p.entregue_em },
  ];
};

const currentStepIndex = (status: string): number => {
  switch (status) {
    case "aguardando_coleta": return 0;
    case "coletado": return 1;
    case "em_producao": return 2;
    case "embalado":
    case "pronto_para_entrega": return 3;
    case "saiu_para_entrega": return 4;
    case "entregue": return 4;
    default: return -1;
  }
};

const ClienteDashboard = () => {
  const { user, profile } = useAuth();
  const [tiposRoupa, setTiposRoupa] = useState<TipoRoupa[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clienteInfo, setClienteInfo] = useState<{ tipo: string } | null>(null);
  const [rotaInfo, setRotaInfo] = useState<RotaInfo | null>(null);
  const [itensSaidaMap, setItensSaidaMap] = useState<Record<string, { nome: string; quantidade: number }[]>>({});
  const [itensPedidoMap, setItensPedidoMap] = useState<Record<string, { nome: string; quantidade: number }[]>>({});
  const [confirmation, setConfirmation] = useState<{ pedido: string } | null>(null);
  const [motoristaNome, setMotoristaNome] = useState<string | null>(null);
  const [motoristaFallbackId, setMotoristaFallbackId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({ permite_cobranca_peca: true, permite_cobranca_peso: true });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);


  // Tab state
  const [activeTab, setActiveTab] = useState<"peca" | "peso">("peca");

  // Weight fields
  const [pesoKg, setPesoKg] = useState("");
  const [weightItems, setWeightItems] = useState<{ tipo_roupa_id: string; quantidade: number }[]>([]);
  const [pesoError, setPesoError] = useState("");

  // Hospital "por peças" — qtds por tipo + peso estimado opcional
  const [hospitalQtys, setHospitalQtys] = useState<HospitalQty[]>([]);
  const [pesoEstimado, setPesoEstimado] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("tipos_roupa").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data, error }) => {
        console.log("tiposRoupa:", data, error);
        setTiposRoupa((data as unknown as TipoRoupa[]) || []);
      });

    if (user && profile?.cliente_id) {
      supabase.from("clientes").select("tipo, rota_id, motorista_id").eq("id", profile.cliente_id).single()
        .then(async ({ data }) => {
          if (!data) return;
          const c = data as unknown as ClienteFull;
          setClienteInfo({ tipo: c.tipo });
          // Fallback: if route has no driver (or no route), use cliente.motorista_id
          const clienteFallback = c.motorista_id || null;
          let resolvedMotorista: string | null = null;
          if (c.rota_id) {
            const { data: r } = await supabase
              .from("rotas")
              .select("id, dias_semana, horario_corte, periodo, motorista_id")
              .eq("id", c.rota_id)
              .single();
            if (r) {
              const merged: any = { ...r, motorista_id: (r as any).motorista_id || clienteFallback };
              setRotaInfo(merged);
              resolvedMotorista = merged.motorista_id || null;
            } else if (clienteFallback) {
              setRotaInfo({ id: "", dias_semana: null, horario_corte: null, periodo: null, motorista_id: clienteFallback } as any);
              resolvedMotorista = clienteFallback;
            }
          } else if (clienteFallback) {
            setRotaInfo({ id: "", dias_semana: null, horario_corte: null, periodo: null, motorista_id: clienteFallback } as any);
            resolvedMotorista = clienteFallback;
          }

          // 3º fallback: qualquer motorista ativo do sistema
          if (!resolvedMotorista) {
            const { data: anyMot } = await (supabase as any).rpc("motorista_fallback_id");
            if (anyMot) {
              resolvedMotorista = anyMot as string;
              setMotoristaFallbackId(anyMot as string);
            }
          }

          if (resolvedMotorista) {
            const { data: nome } = await (supabase as any).rpc("nome_motorista", { _id: resolvedMotorista });
            setMotoristaNome((nome as string) || null);
          } else {
            setMotoristaNome(null);
          }
        });

      supabase.from("usuarios").select("permite_cobranca_peca, permite_cobranca_peso").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            const p = data as unknown as UserPermissions;
            setPermissions(p);
            if (p.permite_cobranca_peca) setActiveTab("peca");
            else if (p.permite_cobranca_peso) setActiveTab("peso");
          }
        });

      refreshOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const isHospital = clienteInfo?.tipo === "hospital";
  const dataColeta = rotaInfo ? calcDataColeta(rotaInfo) : new Date();
  const showBothTabs = permissions.permite_cobranca_peca && permissions.permite_cobranca_peso;
  const showOnlyPeca = permissions.permite_cobranca_peca && !permissions.permite_cobranca_peso;
  const showOnlyPeso = !permissions.permite_cobranca_peca && permissions.permite_cobranca_peso;

  const addItem = () => { if (!isHospital) setItems([...items, { tipo_roupa_id: "", descricao_livre: "", quantidade_original: 1 }]); };
  const addSugestao = (nome: string) => {
    if (isHospital) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.descricao_livre.trim().toLowerCase() === nome.trim().toLowerCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantidade_original: (next[idx].quantidade_original || 0) + 1 };
        return next;
      }
      return [...prev, { tipo_roupa_id: "", descricao_livre: nome, quantidade_original: 1 }];
    });
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemPedido, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const totalPieces = items.reduce((sum, i) => sum + i.quantidade_original, 0);
  const totalHospitalPieces = hospitalQtys.reduce((sum, h) => sum + h.quantidade, 0);

  const refreshOrders = async () => {
    if (!profile?.cliente_id) return;
    const { data } = await supabase.from("pedidos")
      .select("id, numero_pedido, status, criado_em, tipo_cobranca, rascunho, coletado_em, embalado_em, pronto_em, saiu_em, entregue_em, peso_informado_cliente, peso_kg, peso_motorista_kg, clientes(tipo)")
      .eq("cliente_id", profile.cliente_id)
      .order("criado_em", { ascending: false });
    setOrders((data as unknown as Pedido[]) || []);
    const allIds = ((data as any) || []).map((o: any) => o.id);
    const ids = ((data as any) || []).filter((o: any) => ["pronto_para_entrega","saiu_para_entrega","entregue"].includes(o.status)).map((o: any) => o.id);
    if (allIds.length > 0) {
      const { data: itens } = await supabase
        .from("itens_pedido")
        .select("pedido_id, quantidade_original, descricao_livre, tipos_roupa(nome)")
        .in("pedido_id", allIds);
      const mp: Record<string, { nome: string; quantidade: number }[]> = {};
      (itens as any[] || []).forEach((it) => {
        const arr = mp[it.pedido_id] || [];
        arr.push({ nome: it.tipos_roupa?.nome || it.descricao_livre || "Item", quantidade: it.quantidade_original });
        mp[it.pedido_id] = arr;
      });
      setItensPedidoMap(mp);
    }
    if (allIds.length > 0) {
      const { data: saidas } = await supabase
        .from("itens_saida")
        .select("pedido_id, quantidade, descricao_livre, tipos_roupa(nome)")
        .in("pedido_id", allIds);
      const m: Record<string, { nome: string; quantidade: number }[]> = {};
      (saidas as any[] || []).forEach((s) => {
        const arr = m[s.pedido_id] || [];
        arr.push({ nome: s.tipos_roupa?.nome || s.descricao_livre || "Item", quantidade: s.quantidade });
        m[s.pedido_id] = arr;
      });
      setItensSaidaMap(m);
    }
  };

  const resetForm = () => {
    setItems([]);
    setNotes("");
    setPesoKg("");
    setPesoEstimado("");
    setHospitalQtys((prev) => prev.map((h) => ({ ...h, quantidade: 0 })));
    setWeightItems((prev) => prev.map((w) => ({ ...w, quantidade: 0 })));
    setEditingDraftId(null);
    setSubmitError(null);
    setPesoError("");
  };

  const buildItemRows = (pedidoId: string) => {
    if (activeTab === "peso") {
      if (!isHospital) return [];
      return weightItems
        .filter((wi) => wi.quantidade > 0)
        .map((wi) => ({ pedido_id: pedidoId, tipo_roupa_id: wi.tipo_roupa_id, quantidade_original: wi.quantidade, origem: "cliente" }));
    }
    if (isHospital) {
      return hospitalQtys
        .filter((h) => h.quantidade > 0)
        .map((h) => ({ pedido_id: pedidoId, tipo_roupa_id: h.tipo_roupa_id, quantidade_original: h.quantidade, origem: "cliente" }));
    }
    return items.map((i) => ({
      pedido_id: pedidoId,
      tipo_roupa_id: i.tipo_roupa_id || null,
      descricao_livre: i.descricao_livre || null,
      quantidade_original: i.quantidade_original,
      origem: "cliente",
    }));
  };

  const handleEditDraft = async (pedidoId: string) => {
    setLoadingDraft(true);
    setSubmitError(null);
    const { data, error } = await supabase
      .from("pedidos")
      .select("id, tipo_cobranca, peso_kg, peso_informado_cliente, obs_cliente, itens_pedido(tipo_roupa_id, descricao_livre, quantidade_original)")
      .eq("id", pedidoId)
      .single();
    setLoadingDraft(false);
    if (error || !data) {
      setSubmitError("Não foi possível carregar o rascunho.");
      return;
    }
    const p = data as any;
    const itensDraft = (p.itens_pedido || []) as { tipo_roupa_id: string | null; descricao_livre: string | null; quantidade_original: number }[];
    const tipo = p.tipo_cobranca === "peso" ? "peso" : "peca";
    setActiveTab(tipo);
    setNotes(p.obs_cliente || "");
    setPesoKg(p.peso_kg != null ? String(p.peso_kg) : "");
    setPesoEstimado(tipo === "peca" && p.peso_informado_cliente != null ? String(p.peso_informado_cliente) : "");
    if (tipo === "peso") {
      setWeightItems((prev) => {
        const base = prev.length > 0 ? prev : tiposRoupa.map((tr) => ({ tipo_roupa_id: tr.id, quantidade: 0 }));
        return base.map((w) => ({
          ...w,
          quantidade: itensDraft.find((it) => it.tipo_roupa_id === w.tipo_roupa_id)?.quantidade_original || 0,
        }));
      });
      setItems([]);
    } else if (isHospital) {
      setHospitalQtys((prev) => {
        const base = prev.length > 0 ? prev : tiposRoupa.map((tr) => ({ tipo_roupa_id: tr.id, quantidade: 0 }));
        return base.map((h) => ({
          ...h,
          quantidade: itensDraft.find((it) => it.tipo_roupa_id === h.tipo_roupa_id)?.quantidade_original || 0,
        }));
      });
      setItems([]);
    } else {
      setItems(
        itensDraft.map((it) => ({
          tipo_roupa_id: it.tipo_roupa_id || "",
          descricao_livre: it.descricao_livre || tiposRoupa.find((tr) => tr.id === it.tipo_roupa_id)?.nome || "",
          quantidade_original: it.quantidade_original,
        }))
      );
    }
    setEditingDraftId(pedidoId);
    setShowForm(true);
    setExpandedOrder(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateDraft = async (isDraft: boolean, payload: Record<string, unknown>) => {
    if (!user || !editingDraftId) return false;
    setSaving(true);
    const { data, error } = await supabase
      .from("pedidos")
      .update({ ...payload, rascunho: isDraft, status: "aguardando_coleta" } as any)
      .eq("id", editingDraftId)
      .select("id, numero_pedido")
      .single();
    if (error || !data) {
      console.error("[Rascunho] update erro:", error);
      setSubmitError(`Falha ao salvar rascunho: ${error?.message || "erro desconhecido"}`);
      setSaving(false);
      return false;
    }
    const o = data as any;
    await supabase.from("itens_pedido").delete().eq("pedido_id", o.id);
    const rows = buildItemRows(o.id);
    if (rows.length > 0) await supabase.from("itens_pedido").insert(rows as any);
    if (!isDraft) {
      await registrarMudancaStatus(o.id, null, "aguardando_coleta", user.id, "Rascunho enviado pelo cliente");
    }
    resetForm();
    setShowForm(false);
    if (!isDraft) setConfirmation({ pedido: o.numero_pedido });
    await refreshOrders();
    setSaving(false);
    return true;
  };


  const handleSubmitPecas = async (isDraft: boolean) => {
    console.log("[NovoPedido] handleSubmitPecas called", { isDraft, profile, items, isHospital });
    setSubmitError(null);
    if (!user || !profile?.cliente_id) {
      setSubmitError("ID do cliente não encontrado. Faça login novamente.");
      return;
    }
    if (!isHospital && items.length === 0) return;
    const quemContou = isHospital ? "lavanderia" : "cliente";
    if (editingDraftId) {
      await updateDraft(isDraft, {
        tipo_cobranca: "peca",
        obs_cliente: notes || null,
        quem_contou: quemContou,
        peso_kg: null,
        peso_informado_cliente: isHospital && pesoEstimado ? parseFloat(pesoEstimado) : null,
      });
      return;
    }
    setSaving(true);

    const { data: order, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: profile.cliente_id,
        tipo_cobranca: "peca",
        obs_cliente: notes || null,
        quem_contou: quemContou,
        rascunho: isDraft,
        status: "aguardando_coleta",
        peso_informado_cliente: isHospital && pesoEstimado ? parseFloat(pesoEstimado) : null,
        data_coleta_prevista: rotaInfo ? toIsoDate(dataColeta) : null,
        motorista_id: rotaInfo?.motorista_id || motoristaFallbackId || null,
      } as any)
      .select("id, numero_pedido")
      .single();

    if (error) {
      console.error("[NovoPedido] insert pedido (peca) erro:", error);
      setSubmitError(`Falha ao criar pedido: ${error.message}`);
      setSaving(false);
      return;
    }

    if (order && !error) {
      const o = order as any;
      if (!isDraft) {
        await registrarMudancaStatus(o.id, null, "aguardando_coleta", user.id, "Pedido criado pelo cliente");
      }

      // Não-hospital: itens livres digitados
      if (!isHospital && items.length > 0) {
        const orderItems = items.map((i) => ({
          pedido_id: o.id,
          tipo_roupa_id: i.tipo_roupa_id || null,
          descricao_livre: i.descricao_livre || null,
          quantidade_original: i.quantidade_original,
          origem: "cliente",
        }));
        await supabase.from("itens_pedido").insert(orderItems as any);
      }

      // Hospital: quantidades por tipo (do admin)
      if (isHospital && hospitalQtys.some((h) => h.quantidade > 0)) {
        const orderItems = hospitalQtys
          .filter((h) => h.quantidade > 0)
          .map((h) => ({
            pedido_id: o.id,
            tipo_roupa_id: h.tipo_roupa_id,
            quantidade_original: h.quantidade,
            origem: "cliente",
          }));
        await supabase.from("itens_pedido").insert(orderItems as any);
      }

      setItems([]);
      setNotes("");
      setHospitalQtys([]);
      setPesoEstimado("");
      setShowForm(false);
      if (!isDraft) setConfirmation({ pedido: o.numero_pedido });
      await refreshOrders();
    }
    setSaving(false);
  };

  const handleSubmitPeso = async (isDraft: boolean) => {
    console.log("[NovoPedido] handleSubmitPeso called", { isDraft, profile, pesoKg });
    setSubmitError(null);
    if (!user || !profile?.cliente_id) {
      setSubmitError("ID do cliente não encontrado. Faça login novamente.");
      return;
    }
    if (!isDraft && !pesoKg) { setPesoError("Informe o peso das roupas."); return; }
    setPesoError("");
    if (editingDraftId) {
      await updateDraft(isDraft, {
        tipo_cobranca: "peso",
        obs_cliente: notes || null,
        quem_contou: "cliente",
        peso_kg: pesoKg ? parseFloat(pesoKg) : null,
        peso_informado_cliente: pesoKg ? parseFloat(pesoKg) : null,
      });
      return;
    }
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
        status: "aguardando_coleta",
        data_coleta_prevista: rotaInfo ? toIsoDate(dataColeta) : null,
        motorista_id: rotaInfo?.motorista_id || motoristaFallbackId || null,
      } as any)
      .select("id, numero_pedido")
      .single();

    if (error) {
      console.error("[NovoPedido] insert pedido (peso) erro:", error);
      setSubmitError(`Falha ao criar pedido: ${error.message}`);
      setSaving(false);
      return;
    }

    if (order && !error) {
      const o = order as any;
      if (!isDraft) {
        await registrarMudancaStatus(o.id, null, "aguardando_coleta", user.id, "Pedido por peso criado pelo cliente");
      }
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
    if (activeTab === "peso") await handleSubmitPeso(false);
    else await handleSubmitPecas(false);
  };
  const handleSaveDraft = async () => {
    if (activeTab === "peso") await handleSubmitPeso(true);
    else await handleSubmitPecas(true);
  };

  const latestOrder = orders.find(o => !o.rascunho && o.status !== "entregue");

  // Inicializa peso por tipo (hospital, aba Peso)
  useEffect(() => {
    if (isHospital && tiposRoupa.length > 0 && weightItems.length === 0) {
      setWeightItems(tiposRoupa.map(tr => ({ tipo_roupa_id: tr.id, quantidade: 0 })));
    }
    if (isHospital && tiposRoupa.length > 0 && hospitalQtys.length === 0) {
      setHospitalQtys(tiposRoupa.map(tr => ({ tipo_roupa_id: tr.id, quantidade: 0 })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHospital, tiposRoupa]);

  return (
    <AppLayout title="Amaná" subtitle={`Olá, ${profile?.nome || "Cliente"}!`} actions={<NotificationBell />}>
      {/* Progress tracker do pedido ativo */}
      {latestOrder && (
        <div className="mb-5">
          <OrderProgress
            steps={buildSteps(latestOrder)}
            currentIndex={currentStepIndex(latestOrder.status)}
            numeroPedido={latestOrder.numero_pedido}
          />
        </div>
      )}

      {profile?.cliente_id && <ClienteSaldoRoupas clienteId={profile.cliente_id} />}

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

          {/* Aba Por Peças */}
          {activeTab === "peca" && (
            <>
              {isHospital ? (
                <>
                  {tiposRoupa.length > 0 ? (
                    <div className="space-y-2">
                      <label className="field-label">Tipos de roupa</label>
                      {tiposRoupa.map((tr) => {
                        const hq = hospitalQtys.find((h) => h.tipo_roupa_id === tr.id);
                        return (
                          <div key={tr.id} className="flex items-center gap-3">
                            <span className="text-sm text-foreground flex-1">{tr.nome}</span>
                            <input
                              type="number"
                              className="field-input w-20 text-center font-mono text-xs py-1.5"
                              min={0}
                              value={hq?.quantidade || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setHospitalQtys((prev) => prev.map((h) => h.tipo_roupa_id === tr.id ? { ...h, quantidade: val } : h));
                              }}
                              placeholder="0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
                      ⚠ Nenhum tipo de roupa cadastrado pelo administrador.
                    </div>
                  )}

                  <div>
                    <label className="field-label flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Peso estimado (kg) — opcional
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="field-input font-mono"
                      value={pesoEstimado}
                      onChange={(e) => setPesoEstimado(e.target.value)}
                      placeholder="Ex: 4.5"
                    />
                    <p className="text-[11px] mt-1 text-muted-foreground">
                      Informe o peso aproximado se souber. O peso oficial é registrado pela lavanderia.
                    </p>
                  </div>

                  {totalHospitalPieces > 0 && (
                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-[#0c0e14] border-t border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Total de peças</span>
                      <span className="text-lg font-extrabold font-mono" style={{ color: "#34c97a" }}>{totalHospitalPieces}</span>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label mb-0">Peças</label>
                    <button className="btn-primary text-xs px-3 py-1.5" onClick={addItem}><Plus className="w-3 h-3" /> Adicionar</button>
                  </div>
                  {tiposRoupa.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sugestões rápidas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tiposRoupa.map((tr) => (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => addSugestao(tr.nome)}
                            className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-[#0c0e14] text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                          >
                            + {tr.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

          {/* Aba Por Peso */}
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

          {rotaInfo && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(52,201,122,0.10)", border: "1px solid rgba(52,201,122,0.3)" }}>
              <Calendar className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#34c97a" }} />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sua coleta está prevista para</p>
                <p className="text-lg font-extrabold capitalize mt-0.5" style={{ color: "#34c97a" }}>{formatDataColeta(dataColeta)}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.13)", color: "#6b7190", background: "transparent" }}
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {editingDraftId ? "Salvar rascunho" : "Salvar rascunho"}
            </button>
            <button
              className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all text-white"
              style={{ background: "#5b8df6" }}
              onClick={handleSubmit}
              disabled={saving || (activeTab === "peca" && !isHospital && items.length === 0)}
            >
              {saving ? "Enviando..." : isHospital && activeTab === "peca" ? "Salvar e aguardar coleta" : "Enviar Pedido"}
            </button>
          </div>

          {submitError && (
            <div className="rounded-lg px-3 py-2.5 text-xs font-medium" style={{ background: "rgba(224,80,80,0.12)", color: "#e05050", border: "1px solid rgba(224,80,80,0.3)" }}>
              {submitError}
            </div>
          )}

          <button className="btn-ghost w-full" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</button>

        </div>
      )}

      {/* Histórico detalhado */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Meus pedidos</h3>
        {orders.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><p className="empty-state-text">Nenhum pedido ainda</p></div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              return (
                <div key={order.id} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div>
                      <span className="font-mono text-sm font-bold" style={{ color: "#5b8df6" }}>{order.numero_pedido}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.criado_em).toLocaleDateString("pt-BR")}
                        {order.entregue_em && ` • Entregue em ${new Date(order.entregue_em).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.rascunho && (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase rounded-md" style={{ background: "rgba(107,113,144,0.15)", color: "#6b7190" }}>Rascunho</span>
                      )}
                      <StatusBadge status={order.status} />
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {order.rascunho && (
                    <div className="px-4 pb-4 -mt-1">
                      <button
                        className="w-full py-2.5 text-sm font-bold rounded-lg transition-all text-white"
                        style={{ background: "#5b8df6" }}
                        onClick={() => handleEditDraft(order.id)}
                        disabled={loadingDraft}
                      >
                        {loadingDraft ? "Carregando..." : "Editar rascunho"}
                      </button>
                    </div>
                  )}


                  {isExpanded && !order.rascunho && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      <OrderProgress
                        steps={buildSteps(order)}
                        currentIndex={currentStepIndex(order.status)}
                      />
                      {/* O que você enviou */}
                      {order.tipo_cobranca === "peca" && itensPedidoMap[order.id] && itensPedidoMap[order.id].length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">O que você enviou</p>
                          <div className="space-y-1 rounded-lg p-3" style={{ background: "rgba(91,141,246,0.08)" }}>
                            {itensPedidoMap[order.id].map((it, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-foreground">{it.nome}</span>
                                <span className="font-mono font-bold" style={{ color: "#5b8df6" }}>{it.quantidade}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {order.tipo_cobranca === "peso" && (order.peso_informado_cliente || order.peso_kg) && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">O que você enviou</p>
                          <div className="flex justify-between text-xs rounded-lg p-3" style={{ background: "rgba(91,141,246,0.08)" }}>
                            <span className="text-foreground">Peso informado</span>
                            <span className="font-mono font-bold" style={{ color: "#5b8df6" }}>
                              {(Number(order.peso_informado_cliente ?? order.peso_kg)).toFixed(3)} kg
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Comparativo enviado x devolvido */}
                      {(() => {
                        const showCompare = ["pronto_para_entrega", "saiu_para_entrega", "entregue"].includes(order.status);
                        if (!showCompare) return null;
                        if (order.tipo_cobranca === "peca") {
                          const enviados = (itensPedidoMap[order.id] || []).reduce((s, it) => s + it.quantidade, 0);
                          const devolvidos = (itensSaidaMap[order.id] || []).reduce((s, it) => s + it.quantidade, 0);
                          if (enviados === 0 && devolvidos === 0) return null;
                          if (devolvidos === 0) {
                            return (
                              <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-muted-foreground">Enviado: <span className="font-mono font-bold text-foreground">{enviados}</span> peças</span>
                                </div>
                                <p className="font-semibold mt-1" style={{ color: "#f0a020" }}>
                                  Peças de devolução serão registradas pela produção
                                </p>
                              </div>
                            );
                          }
                          const ok = enviados === devolvidos;
                          return (
                            <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Enviado: <span className="font-mono font-bold text-foreground">{enviados}</span> peças</span>
                                <span className="text-muted-foreground">Devolvido: <span className="font-mono font-bold text-foreground">{devolvidos}</span> peças</span>
                              </div>
                              <p className="font-semibold mt-1" style={{ color: ok ? "#34c97a" : "#f0a020" }}>
                                {ok ? "Conferência ok ✓" : "Verifique com a lavanderia"}
                              </p>
                            </div>
                          );
                        }
                        if (order.tipo_cobranca === "peso") {
                          const enviado = Number(order.peso_informado_cliente ?? order.peso_kg ?? 0);
                          const coletado = order.peso_motorista_kg != null ? Number(order.peso_motorista_kg) : null;
                          const ok = coletado != null ? Math.abs(enviado - coletado) < 0.01 : true;
                          const saida = itensSaidaMap[order.id] || [];
                          const devolvidas = saida.reduce((s, it) => s + it.quantidade, 0);
                          if (enviado === 0 && coletado == null && devolvidas === 0) return null;
                          return (
                            <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Peso enviado: <span className="font-mono font-bold text-foreground">{enviado.toFixed(3)} kg</span></span>
                                {coletado != null && (
                                  <span className="text-muted-foreground">Peso coletado: <span className="font-mono font-bold text-foreground">{coletado.toFixed(3)} kg</span></span>
                                )}
                              </div>
                              {devolvidas > 0 ? (
                                <div className="mt-2 space-y-1 border-t border-border pt-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Peças devolvidas</span>
                                    <span className="font-mono font-bold text-foreground">{devolvidas}</span>
                                  </div>
                                  {saida.map((it, i) => (
                                    <div key={i} className="flex justify-between">
                                      <span className="text-foreground">{it.nome}</span>
                                      <span className="font-mono font-bold" style={{ color: "#5b8df6" }}>{it.quantidade}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="font-semibold mt-1" style={{ color: "#f0a020" }}>
                                  Peças de devolução serão registradas pela produção
                                </p>
                              )}
                              {coletado != null && (
                                <p className="font-semibold mt-1" style={{ color: ok ? "#34c97a" : "#f0a020" }}>
                                  {ok ? "Conferência ok ✓" : "Verifique com a lavanderia"}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {(() => {
                        const saida = itensSaidaMap[order.id] || [];
                        const finalizado = ["pronto_para_entrega", "saiu_para_entrega", "entregue"].includes(order.status);
                        if (saida.length > 0) {
                          const total = saida.reduce((s, it) => s + it.quantidade, 0);
                          return (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Peças registradas pela produção</p>
                              <div className="space-y-1 rounded-lg p-3" style={{ background: "rgba(91,141,246,0.08)" }}>
                                {saida.map((it, i) => (
                                  <div key={i} className="flex justify-between text-xs">
                                    <span className="text-foreground">{it.nome}</span>
                                    <span className="font-mono font-bold" style={{ color: "#5b8df6" }}>{it.quantidade}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                                  <span className="text-muted-foreground">Total</span>
                                  <span className="font-mono font-bold text-foreground">{total} peças</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (finalizado) {
                          return (
                            <p className="text-[11px] text-muted-foreground">Aguardando registro de peças pela produção</p>
                          );
                        }
                        return null;
                      })()}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Linha do tempo</p>
                        <OrderTimeline pedidoId={order.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant="info" title="Pedido Criado" onClose={() => setConfirmation(null)}>
          <div className="flex justify-between"><span>Status:</span><span className="text-foreground">Aguardando coleta</span></div>
          {activeTab === "peca" && !isHospital && <div className="flex justify-between"><span>Peças:</span><span className="text-foreground font-mono">{totalPieces}</span></div>}
          {activeTab === "peca" && isHospital && totalHospitalPieces > 0 && <div className="flex justify-between"><span>Peças:</span><span className="text-foreground font-mono">{totalHospitalPieces}</span></div>}
          {activeTab === "peca" && isHospital && pesoEstimado && <div className="flex justify-between"><span>Peso estimado:</span><span className="text-foreground font-mono">{parseFloat(pesoEstimado).toFixed(3)} kg</span></div>}
          {activeTab === "peso" && pesoKg && <div className="flex justify-between"><span>Peso:</span><span className="text-foreground font-mono">{parseFloat(pesoKg).toFixed(3)} kg</span></div>}
          {motoristaNome ? (
            <div className="flex justify-between"><span>Motorista responsável:</span><span className="text-foreground font-medium">{motoristaNome}</span></div>
          ) : (
            <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: "rgba(240,160,32,0.12)", border: "1px solid rgba(240,160,32,0.35)", color: "#f0a020" }}>
              Nenhum motorista atribuído — contate o administrador.
            </div>
          )}
        </ConfirmationModal>
      )}
    </AppLayout>
  );
};

export default ClienteDashboard;
