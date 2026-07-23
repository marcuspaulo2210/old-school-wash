import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, X, GripVertical } from "lucide-react";

interface Rota {
  id: string;
  nome: string;
  motorista_id: string | null;
  dias_semana: string[];
  observacoes: string | null;
  ativo: boolean;
  periodo?: string | null;
  horario_corte?: string | null;
}

interface Motorista { id: string; nome: string; }
interface Cliente { id: string; nome: string; endereco: string | null; }
interface RotaCliente { id: string; rota_id: string; cliente_id: string; ordem: number; clientes?: { nome: string; endereco: string | null } | null; }

const diasSemana = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

const Rotas = () => {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rota | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotaClientes, setRotaClientes] = useState<RotaCliente[]>([]);
  const [selectedRota, setSelectedRota] = useState<string | null>(null);

  // Form
  const [nome, setNome] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [dias, setDias] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<"manha" | "tarde" | "livre">("manha");

  const fetchAll = async () => {
    const [{ data: r }, { data: m }, { data: c }] = await Promise.all([
      supabase.from("rotas").select("*").order("nome"),
      supabase.from("usuarios").select("id, nome").eq("perfil", "motorista").eq("ativo", true),
      supabase.from("clientes").select("id, nome, endereco").eq("ativo", true).order("nome"),
    ]);
    setRotas((r as unknown as Rota[]) || []);
    setMotoristas((m as unknown as Motorista[]) || []);
    setAllClientes((c as unknown as Cliente[]) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const loadRotaClientes = async (rotaId: string) => {
    const { data } = await supabase
      .from("rotas_clientes")
      .select("id, rota_id, cliente_id, ordem, clientes(nome, endereco)")
      .eq("rota_id", rotaId)
      .order("ordem");
    setRotaClientes((data as unknown as RotaCliente[]) || []);
    setSelectedRota(rotaId);
  };

  const resetForm = () => {
    setNome(""); setMotoristaId(""); setDias([]); setObs(""); setClientesSelecionados([]); setEditing(null); setPeriodo("manha");
  };

  const openEdit = (r: Rota) => {
    setEditing(r);
    setNome(r.nome);
    setMotoristaId(r.motorista_id || "");
    setDias(r.dias_semana || []);
    setObs(r.observacoes || "");
    setPeriodo(((r.periodo as any) || "manha"));
    setShowForm(true);
    // Load clientes for this rota
    supabase.from("rotas_clientes").select("cliente_id").eq("rota_id", r.id).order("ordem")
      .then(({ data }) => setClientesSelecionados((data || []).map((d: any) => d.cliente_id)));
  };

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    const horario_corte = periodo === "manha" ? "12:00:00" : periodo === "tarde" ? "18:00:00" : null;
    const payload: any = {
      nome: nome.trim(),
      motorista_id: motoristaId || null,
      dias_semana: dias,
      observacoes: obs || null,
      periodo,
      horario_corte,
    };

    let rotaId: string;
    if (editing) {
      await supabase.from("rotas").update(payload).eq("id", editing.id);
      rotaId = editing.id;
    } else {
      const { data } = await supabase.from("rotas").insert(payload).select("id").single();
      rotaId = data?.id;
    }

    // Update rotas_clientes
    if (rotaId) {
      await supabase.from("rotas_clientes").delete().eq("rota_id", rotaId);
      if (clientesSelecionados.length > 0) {
        await supabase.from("rotas_clientes").insert(
          clientesSelecionados.map((cid, i) => ({ rota_id: rotaId, cliente_id: cid, ordem: i }))
        );
      }
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchAll();
  };

  const toggleDia = (d: string) => {
    setDias((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const toggleCliente = (cid: string) => {
    setClientesSelecionados((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  };

  const moveCliente = (idx: number, dir: -1 | 1) => {
    const arr = [...clientesSelecionados];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setClientesSelecionados(arr);
  };

  return (
    <AdminLayout title="Rotas" subtitle="Rotas de coleta e entrega">
      {showForm && (
        <div className="app-card-elevated mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">{editing ? "Editar Rota" : "Nova Rota"}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome da rota *</label>
              <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Rota Norte" />
            </div>
            <div>
              <label className="field-label">Motorista</label>
              <select className="field-select" value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
                <option value="">Selecione...</option>
                {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Período da rota *</label>
            <div className="flex gap-2 mt-1">
              {(["manha","tarde","livre"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${periodo === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >{p === "manha" ? "Manhã" : p === "tarde" ? "Tarde" : "Livre"}</button>
              ))}
            </div>
            <p className="text-[11px] mt-2 text-muted-foreground">
              {periodo === "manha" && "Horário de corte: 12:00 — pedidos após esse horário serão agendados para o próximo dia de coleta"}
              {periodo === "tarde" && "Horário de corte: 18:00 — pedidos após esse horário serão agendados para o próximo dia de coleta"}
              {periodo === "livre" && "Sem horário de corte — coleta disponível a qualquer momento (recomendado para hospitais)"}
            </p>
          </div>
          <div>
            <label className="field-label">Dias da semana</label>
            <div className="flex gap-2 mt-1">
              {diasSemana.map((d) => (
                <button key={d} type="button" onClick={() => toggleDia(d)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${dias.includes(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >{d.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Clientes da rota (ordem de visita)</label>
            <div className="space-y-1 mt-2">
              {clientesSelecionados.map((cid, idx) => {
                const cl = allClientes.find((c) => c.id === cid);
                return (
                  <div key={cid} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                    <span className="font-mono text-xs text-muted-foreground w-6">{idx + 1}.</span>
                    <span className="text-sm text-foreground flex-1">{cl?.nome}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveCliente(idx, -1)} className="text-muted-foreground hover:text-foreground text-xs">↑</button>
                      <button onClick={() => moveCliente(idx, 1)} className="text-muted-foreground hover:text-foreground text-xs">↓</button>
                      <button onClick={() => toggleCliente(cid)} className="text-destructive text-xs ml-1">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2">
              <select className="field-select text-xs" onChange={(e) => { if (e.target.value) toggleCliente(e.target.value); e.target.value = ""; }}>
                <option value="">+ Adicionar cliente...</option>
                {allClientes.filter((c) => !clientesSelecionados.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Observações</label>
            <textarea className="field-input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <button className="btn-primary w-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar rota"}
          </button>
        </div>
      )}

      {!showForm && (
        <button className="btn-primary text-xs px-3 py-2 mb-4" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Nova Rota
        </button>
      )}

      <div className="space-y-2">
        {rotas.length === 0 && <div className="empty-state"><div className="empty-state-icon">📍</div><p className="empty-state-text">Nenhuma rota cadastrada</p></div>}
        {rotas.map((r) => {
          const mot = motoristas.find((m) => m.id === r.motorista_id);
          return (
            <div key={r.id} className="list-item flex-col items-start gap-2">
              <div className="flex items-center justify-between w-full">
                <div className="cursor-pointer" onClick={() => openEdit(r)}>
                  <div className="text-sm font-bold text-foreground">{r.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {mot ? mot.nome : "Sem motorista"} • {(r.dias_semana || []).map((d) => d.toUpperCase()).join(", ") || "Sem dias"}
                  </div>
                </div>
                <button onClick={() => loadRotaClientes(r.id)} className="badge-primary text-[10px]">Ver paradas</button>
              </div>
              {selectedRota === r.id && rotaClientes.length > 0 && (
                <div className="w-full space-y-1 mt-1">
                  {rotaClientes.map((rc, i) => (
                    <div key={rc.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
                      <span className="font-mono w-5">{i + 1}.</span>
                      <span className="text-foreground">{rc.clientes?.nome}</span>
                      {rc.clientes?.endereco && <span className="text-muted-foreground">— {rc.clientes.endereco}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default Rotas;
