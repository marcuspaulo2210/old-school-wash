import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Search, X, Eye, EyeOff, Check, Bell } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  tipo: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  responsavel?: string | null;
  preco_peca?: number | null;
  preco_kg?: number | null;
  tipo_cobranca?: string;
  dias_coleta?: string[];
  observacoes?: string | null;
  auth_user_id?: string | null;
}

const diasSemana = ["seg", "ter", "qua", "qui", "sex", "sab"];

const getPasswordStrength = (pw: string): { label: string; color: string; percent: number } => {
  if (!pw) return { label: "", color: "", percent: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Fraca", color: "hsl(var(--destructive))", percent: 33 };
  if (score <= 4) return { label: "Média", color: "hsl(var(--warning))", percent: 66 };
  return { label: "Forte", color: "hsl(var(--success))", percent: 100 };
};

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"clinica" | "hospital">("clinica");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [tipoCobranca, setTipoCobranca] = useState<"peca" | "peso">("peca");
  const [precoPeca, setPrecoPeca] = useState("");
  const [precoKg, setPrecoKg] = useState("");
  const [diasColeta, setDiasColeta] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  // Password fields (new client only)
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [senhaError, setSenhaError] = useState("");

  // Recusa
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes((data as unknown as Cliente[]) || []);
  };

  const fetchSolicitacoes = async () => {
    const { data } = await supabase.from("solicitacoes_clientes").select("*").eq("status", "pendente").order("criado_em", { ascending: false });
    setSolicitacoes((data as any) || []);
  };

  useEffect(() => { fetchClientes(); fetchSolicitacoes(); }, []);

  const resetForm = () => {
    setNome(""); setTipo("clinica"); setEndereco(""); setTelefone("");
    setEmail(""); setResponsavel(""); setTipoCobranca("peca");
    setPrecoPeca(""); setPrecoKg(""); setDiasColeta([]); setObservacoes(""); setAtivo(true);
    setSenha(""); setConfirmarSenha(""); setSenhaError(""); setShowSenha(false); setShowConfirmar(false);
    setEditing(null); setNameError("");
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setNome(c.nome);
    setTipo(c.tipo as any);
    setEndereco(c.endereco || "");
    setTelefone(c.telefone || "");
    setEmail(c.email || "");
    setResponsavel((c as any).responsavel || "");
    setTipoCobranca(((c as any).tipo_cobranca as any) || "peca");
    setPrecoPeca(String((c as any).preco_peca || ""));
    setPrecoKg(String((c as any).preco_kg || ""));
    setDiasColeta((c as any).dias_coleta || []);
    setObservacoes((c as any).observacoes || "");
    setAtivo(c.ativo);
    setSenha(""); setConfirmarSenha(""); setSenhaError("");
    setNameError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    console.log("[Clientes] handleSave start", { editing: editing?.id, nome });
    setFormError("");
    setFormSuccess("");

    if (!nome.trim()) {
      setNameError("Informe o nome do cliente.");
      return;
    }

    // Check unique name (case-insensitive, trimmed)
    const nomeLimpo = nome.trim();
    const duplicate = clientes.find(
      (c) => c.nome.trim().toLowerCase() === nomeLimpo.toLowerCase() && c.id !== editing?.id,
    );
    if (duplicate) {
      setNameError("Já existe um cliente com este nome.");
      return;
    }
    setNameError("");

    // For new clients, password is required
    if (!editing) {
      if (!senha) { setSenhaError("Informe uma senha para o cliente"); return; }
      if (senha !== confirmarSenha) { setSenhaError("As senhas não coincidem"); return; }
      if (senha.length < 6) { setSenhaError("Senha deve ter pelo menos 6 caracteres"); return; }
    }
    setSenhaError("");
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-create-cliente", {
        body: {
          id: editing?.id,
          nome: nomeLimpo,
          tipo,
          senha: editing ? undefined : senha,
          endereco: endereco.trim() || null,
          telefone: telefone.trim() || null,
          email: email.trim() || null,
          responsavel: responsavel.trim() || null,
          tipo_cobranca: tipoCobranca,
          preco_peca: precoPeca || 0,
          preco_kg: precoKg || 0,
          dias_coleta: diasColeta,
          observacoes: observacoes.trim() || null,
          ativo,
        },
      });

      console.log("[Clientes] handleSave response", { data, error });

      if (error) {
        setFormError(error.message || "Erro ao salvar cliente.");
        setSaving(false);
        return;
      }
      if (data?.error) {
        setFormError(data.error);
        setSaving(false);
        return;
      }

      setFormSuccess(editing ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      await fetchClientes();
      setTimeout(() => {
        setShowForm(false);
        resetForm();
        setFormSuccess("");
      }, 900);
    } catch (e: any) {
      console.error("[Clientes] handleSave exception", e);
      setFormError(e?.message || "Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDia = (d: string) => {
    setDiasColeta((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleApproveSolicitacao = async (solic: any) => {
    // Pre-fill the form with the solicitation data
    resetForm();
    setNome(solic.nome);
    setTipo(solic.tipo === "hospital" ? "hospital" : "clinica");
    setEmail(solic.email || "");
    setTelefone(solic.telefone || "");
    setObservacoes(solic.observacoes || "");
    setShowForm(true);

    // Mark as approved
    const currentUser = (await supabase.auth.getUser()).data.user;
    await supabase.from("solicitacoes_clientes").update({
      status: "aprovada",
      resolvido_em: new Date().toISOString(),
      resolvido_por: currentUser?.id,
    } as any).eq("id", solic.id);
    fetchSolicitacoes();
  };

  const handleRejectSolicitacao = async (solicId: string) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    await supabase.from("solicitacoes_clientes").update({
      status: "recusada",
      motivo_recusa: motivoRecusa || null,
      resolvido_em: new Date().toISOString(),
      resolvido_por: currentUser?.id,
    } as any).eq("id", solicId);
    setRecusandoId(null);
    setMotivoRecusa("");
    fetchSolicitacoes();
  };

  const strength = getPasswordStrength(senha);
  const filtered = clientes.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout
      title="Clientes"
      subtitle="Gerenciamento de clínicas e hospitais"
      actions={
        <button className="btn-primary text-xs px-3 py-2" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      }
    >
      {/* Form */}
      {showForm && (
        <div className="app-card-elevated mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">{editing ? "Editar Cliente" : "Novo Cliente"}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome *</label>
              <input className="field-input" value={nome} onChange={(e) => { setNome(e.target.value); setNameError(""); }} placeholder="Nome do cliente" />
              {nameError && <p className="text-[11px] mt-1 text-destructive font-semibold">{nameError}</p>}
            </div>
            <div>
              <label className="field-label">Tipo *</label>
              <div className="flex gap-3 mt-1">
                {(["clinica", "hospital"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={tipo === t} onChange={() => setTipo(t)} className="accent-primary" />
                    <span className="text-sm text-foreground capitalize">{t === "clinica" ? "Clínica" : "Hospital"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Password fields - only for new clients */}
            {!editing && (
              <>
                <div>
                  <label className="field-label">Senha inicial *</label>
                  <div className="relative">
                    <input
                      className="field-input pr-10"
                      type={showSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => { setSenha(e.target.value); setSenhaError(""); }}
                      placeholder="Senha do cliente"
                    />
                    <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {senha && (
                    <div className="mt-2 space-y-1">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${strength.percent}%`, background: strength.color }} />
                      </div>
                      <p className="text-[11px] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label">Confirmar senha *</label>
                  <div className="relative">
                    <input
                      className="field-input pr-10"
                      type={showConfirmar ? "text" : "password"}
                      value={confirmarSenha}
                      onChange={(e) => { setConfirmarSenha(e.target.value); setSenhaError(""); }}
                      placeholder="Confirme a senha"
                    />
                    <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmarSenha && senha !== confirmarSenha && (
                    <p className="text-[11px] mt-1 text-destructive font-semibold">As senhas não coincidem</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="field-label">Endereço</label>
              <input className="field-input" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Telefone</label>
              <input className="field-input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Responsável</label>
              <input className="field-input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>

          {senhaError && <p className="text-xs text-destructive font-semibold">{senhaError}</p>}
          {formError && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-semibold px-4 py-3">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-lg bg-success/10 text-success text-sm font-semibold px-4 py-3" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
              {formSuccess}
            </div>
          )}

          {/* Cobrança */}
          <div>
            <label className="field-label">Tipo de Cobrança</label>
            <div className="flex gap-3 mt-1">
              {(["peca", "peso"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={tipoCobranca === t} onChange={() => setTipoCobranca(t)} className="accent-primary" />
                  <span className="text-sm text-foreground">{t === "peca" ? "Por peça" : "Por peso"}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tipoCobranca === "peca" && (
              <div>
                <label className="field-label">Preço por peça (R$)</label>
                <input className="field-input" type="number" step="0.01" value={precoPeca} onChange={(e) => setPrecoPeca(e.target.value)} />
              </div>
            )}
            {tipoCobranca === "peso" && (
              <div>
                <label className="field-label">Preço por kg (R$)</label>
                <input className="field-input" type="number" step="0.01" value={precoKg} onChange={(e) => setPrecoKg(e.target.value)} />
              </div>
            )}
          </div>

          {/* Dias de coleta */}
          <div>
            <label className="field-label">Dias de coleta</label>
            <div className="flex gap-2 mt-1">
              {diasSemana.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDia(d)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    diasColeta.includes(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Observações</label>
            <textarea className="field-input" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <label className="field-label mb-0">Status</label>
            <button
              type="button"
              onClick={() => setAtivo(!ativo)}
              className={`px-3 py-1 text-xs font-bold rounded-md ${ativo ? "badge-success" : "badge-neutral"}`}
            >
              {ativo ? "Ativo" : "Inativo"}
            </button>
          </div>

          <button className="btn-primary w-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
          </button>
        </div>
      )}

      {/* Pending client solicitations */}
      {solicitacoes.length > 0 && (
        <div className="app-card-elevated mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "#2dbfa0" }} />
            <h3 className="text-sm font-bold text-foreground">Solicitações de novos clientes ({solicitacoes.length})</h3>
          </div>
          {solicitacoes.map((s: any) => (
            <div key={s.id} className="p-3 rounded-lg bg-secondary/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.tipo === "hospital" ? "Hospital" : "Clínica"}
                    {s.telefone ? ` • ${s.telefone}` : ""}
                    {s.email ? ` • ${s.email}` : ""}
                  </p>
                  {s.observacoes && <p className="text-xs text-muted-foreground mt-1">Obs: {s.observacoes}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">Solicitado em {new Date(s.criado_em).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleApproveSolicitacao(s)} title="Aprovar e cadastrar">
                    <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                  </button>
                  <button className="text-xs px-2 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" onClick={() => setRecusandoId(recusandoId === s.id ? null : s.id)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {recusandoId === s.id && (
                <div className="flex gap-2">
                  <input className="field-input text-xs flex-1" placeholder="Motivo da recusa (opcional)" value={motivoRecusa} onChange={(e) => setMotivoRecusa(e.target.value)} />
                  <button className="btn-ghost text-xs px-3" onClick={() => handleRejectSolicitacao(s.id)}>Confirmar recusa</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="empty-state"><div className="empty-state-icon">🏢</div><p className="empty-state-text">Nenhum cliente encontrado</p></div>}
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`list-item ${!c.ativo ? "opacity-40" : ""}`}
            onClick={() => openEdit(c)}
          >
            <div>
              <div className="text-sm font-bold text-foreground">{c.nome}</div>
              <div className="text-xs text-muted-foreground">{c.tipo === "hospital" ? "Hospital" : "Clínica"} {c.telefone ? `• ${c.telefone}` : ""}</div>
            </div>
            <span className={c.ativo ? "badge-success" : "badge-neutral"}>{c.ativo ? "Ativo" : "Inativo"}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Clientes;
