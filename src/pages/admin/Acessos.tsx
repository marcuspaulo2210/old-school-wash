import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Search, X, Eye, EyeOff, Key, Power, Pencil } from "lucide-react";
import { toast } from "sonner";
import PrecosClienteSection from "@/components/admin/PrecosClienteSection";

type TipoFiltro = "todos" | "clinica" | "hospital" | "motorista" | "producao" | "admin";

interface Row {
  id: string;
  origem: "cliente" | "funcionario";
  nome: string;
  tipo: "clinica" | "hospital" | "motorista" | "producao" | "admin";
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  auth_user_id: string | null; // for clientes; for funcionarios = id
  raw: any;
}

interface RotaOpt {
  id: string;
  nome: string;
  periodo: string | null;
  dias_semana: string[] | null;
}

interface MotoristaOpt {
  id: string;
  nome: string;
}

const tipoMeta: Record<Row["tipo"], { label: string; cls: string }> = {
  clinica: { label: "Clínica", cls: "badge-success" },
  hospital: { label: "Hospital", cls: "badge-purple" },
  motorista: { label: "Motorista", cls: "badge-warning" },
  producao: { label: "Produção", cls: "badge-primary" },
  admin: { label: "Admin", cls: "badge", },
};

const filtros: { key: TipoFiltro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "clinica", label: "Clínicas" },
  { key: "hospital", label: "Hospitais" },
  { key: "motorista", label: "Motoristas" },
  { key: "producao", label: "Produção" },
  { key: "admin", label: "Admin" },
];

const Acessos = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filtro, setFiltro] = useState<TipoFiltro>("todos");
  const [search, setSearch] = useState("");
  const [showInativos, setShowInativos] = useState(false);
  const [loading, setLoading] = useState(true);

  // New modal
  const [showNew, setShowNew] = useState(false);
  const [novoTipo, setNovoTipo] = useState<"cliente" | "funcionario">("cliente");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  // Shared form
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  // Cliente fields
  const [tipoCliente, setTipoCliente] = useState<"clinica" | "hospital">("clinica");
  const [rotaId, setRotaId] = useState<string>("");
  const [rotas, setRotas] = useState<RotaOpt[]>([]);
  const [motoristas, setMotoristas] = useState<MotoristaOpt[]>([]);
  // Funcionario fields
  const [perfil, setPerfil] = useState<"admin" | "motorista" | "producao">("motorista");

  // Edit modal
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editTipo, setEditTipo] = useState<"clinica" | "hospital">("clinica");
  const [editPerfil, setEditPerfil] = useState<"admin" | "motorista" | "producao">("motorista");
  const [editRotaId, setEditRotaId] = useState<string>("");
  const [editMotoristaId, setEditMotoristaId] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [resetSenha, setResetSenha] = useState("");
  const [resetConfirmar, setResetConfirmar] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetErr, setResetErr] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cls }, { data: us }, { data: rs }] = await Promise.all([
      supabase.from("clientes").select("id, nome, tipo, email, telefone, ativo, auth_user_id, rota_id, motorista_id, tarifa_minima").order("nome"),
      supabase.from("usuarios").select("id, nome, email, perfil, ativo, telefone").order("nome"),
      supabase.from("rotas").select("id, nome, periodo, dias_semana").eq("ativo", true).order("nome"),
    ]);
    setRotas((rs as any) || []);
    const mots = ((us as any[]) || []).filter((u) => u.perfil === "motorista" && u.ativo).map((u) => ({ id: u.id, nome: u.nome }));
    setMotoristas(mots);

    const cliRows: Row[] = (cls || []).map((c: any) => ({
      id: c.id,
      origem: "cliente",
      nome: c.nome,
      tipo: c.tipo as "clinica" | "hospital",
      email: c.email,
      telefone: c.telefone,
      ativo: c.ativo,
      auth_user_id: c.auth_user_id,
      raw: c,
    }));

    const userRows: Row[] = (us || [])
      .filter((u: any) => u.perfil !== "cliente")
      .map((u: any) => ({
        id: u.id,
        origem: "funcionario",
        nome: u.nome,
        tipo: u.perfil as "motorista" | "producao" | "admin",
        email: u.email,
        telefone: u.telefone,
        ativo: u.ativo,
        auth_user_id: u.id,
        raw: u,
      }));

    setRows([...cliRows, ...userRows]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filtro !== "todos" && r.tipo !== filtro) return false;
      if (!showInativos && !r.ativo) return false;
      if (showInativos && r.ativo) return false;
      if (search && !r.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filtro, search, showInativos]);

  const resetForm = () => {
    setNome(""); setEmail(""); setTelefone(""); setSenha(""); setConfirmar("");
    setTipoCliente("clinica"); setPerfil("motorista"); setFormErr(""); setShowSenha(false); setRotaId("");
  };

  const handleCreate = async () => {
    setFormErr("");
    if (!nome.trim()) { setFormErr("Informe o nome"); return; }
    if (novoTipo === "funcionario" && !email.trim()) { setFormErr("Email é obrigatório para funcionários"); return; }
    if (!senha || senha.length < 6) { setFormErr("Senha deve ter pelo menos 6 caracteres"); return; }
    if (senha !== confirmar) { setFormErr("As senhas não coincidem"); return; }

    setSaving(true);
    try {
      if (novoTipo === "cliente") {
        if (tipoCliente === "clinica" && !rotaId) { setFormErr("Selecione a rota de coleta da clínica"); setSaving(false); return; }
        const { data, error } = await supabase.functions.invoke("admin-create-cliente", {
          body: {
            nome: nome.trim(),
            tipo: tipoCliente,
            senha,
            email: email.trim() || null,
            telefone: telefone.trim() || null,
            ativo: true,
            rota_id: rotaId || null,
          },
        });
        if (error || data?.error) {
          setFormErr(error?.message || data?.error || "Erro ao criar cliente");
          setSaving(false);
          return;
        }
        toast.success("Cliente criado com sucesso!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { name: nome.trim() } },
        });
        if (error || !data.user) {
          setFormErr(error?.message || "Erro ao criar funcionário");
          setSaving(false);
          return;
        }
        const { error: upErr } = await supabase.from("usuarios").upsert({
          id: data.user.id,
          nome: nome.trim(),
          email: email.trim(),
          perfil: perfil as any,
          telefone: telefone.trim() || null,
          primeiro_acesso: false,
          ativo: true,
        } as any);
        if (upErr) {
          setFormErr(upErr.message);
          setSaving(false);
          return;
        }
        toast.success("Funcionário criado com sucesso!");
      }
      setShowNew(false);
      resetForm();
      await fetchAll();
    } catch (e: any) {
      setFormErr(e?.message || "Erro inesperado");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (r: Row) => {
    setEditTarget(r);
    setEditNome(r.nome);
    setEditEmail(r.email || "");
    setEditTelefone(r.telefone || "");
    if (r.origem === "cliente") {
      setEditTipo(r.tipo as "clinica" | "hospital");
      setEditRotaId(r.raw?.rota_id || "");
      setEditMotoristaId(r.raw?.motorista_id || "");
    }
    else setEditPerfil(r.tipo as "admin" | "motorista" | "producao");
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      if (editTarget.origem === "cliente") {
        const { error } = await supabase.from("clientes").update({
          nome: editNome.trim(),
          tipo: editTipo as any,
          email: editEmail.trim() || null,
          telefone: editTelefone.trim() || null,
          rota_id: editRotaId || null,
          motorista_id: editMotoristaId || null,
        } as any).eq("id", editTarget.id);
        if (error) { toast.error(error.message); setEditSaving(false); return; }
      } else {
        const { error } = await supabase.from("usuarios").update({
          nome: editNome.trim(),
          email: editEmail.trim(),
          perfil: editPerfil as any,
          telefone: editTelefone.trim() || null,
        } as any).eq("id", editTarget.id);
        if (error) { toast.error(error.message); setEditSaving(false); return; }
      }
      toast.success("Dados atualizados com sucesso!");
      setEditTarget(null);
      await fetchAll();
    } finally {
      setEditSaving(false);
    }
  };

  const toggleAtivo = async (r: Row) => {
    const tbl = r.origem === "cliente" ? "clientes" : "usuarios";
    const { error } = await supabase.from(tbl as any).update({ ativo: !r.ativo } as any).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.ativo ? "Desativado" : "Ativado");
    fetchAll();
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetErr("");
    if (!resetSenha || resetSenha.length < 6) { setResetErr("Mínimo 6 caracteres"); return; }
    if (resetSenha !== resetConfirmar) { setResetErr("As senhas não coincidem"); return; }

    const authId = resetTarget.origem === "cliente" ? resetTarget.auth_user_id : resetTarget.id;
    if (!authId) { setResetErr("Usuário sem conta de autenticação"); return; }

    setResetting(true);
    const { error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: authId, new_password: resetSenha },
    });
    setResetting(false);
    if (error) { setResetErr("Erro ao redefinir senha"); return; }

    // Reset counter if funcionario
    if (resetTarget.origem === "funcionario") {
      await supabase.from("usuarios").update({ quantidade_trocas_senha: 0 } as any).eq("id", resetTarget.id);
    } else {
      await supabase.from("clientes").update({ quantidade_trocas_senha: 0, tentativas_login: 0, bloqueado_ate: null } as any).eq("id", resetTarget.id);
    }

    toast.success("Senha redefinida com sucesso!");
    setResetTarget(null);
    setResetSenha("");
    setResetConfirmar("");
  };

  return (
    <AdminLayout
      title="Acessos"
      subtitle="Clientes e funcionários em uma única lista"
      actions={
        <button className="btn-primary text-xs px-3 py-2" onClick={() => { resetForm(); setShowNew(true); }}>
          <Plus className="w-4 h-4" /> Novo
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filtros.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filtro === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowInativos(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${!showInativos ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setShowInativos(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${showInativos ? "bg-muted text-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Inativos
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="app-card-elevated overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
            )}
            {filtered.map((r) => {
              const meta = tipoMeta[r.tipo];
              return (
                <tr key={`${r.origem}-${r.id}`} className="border-b last:border-b-0 hover:bg-secondary/40 transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <div>{r.nome}</div>
                    {r.origem === "cliente" && r.raw?.motorista_id && (
                      <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                        Motorista: {motoristas.find((m) => m.id === r.raw.motorista_id)?.nome || "—"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={meta.cls} style={r.tipo === "admin" ? { background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" } : undefined}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.email && <div>{r.email}</div>}
                    {r.telefone && <div>{r.telefone}</div>}
                    {!r.email && !r.telefone && <span>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={r.ativo ? "badge-success" : "badge-neutral"}>{r.ativo ? "Ativo" : "Inativo"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(r)} className="btn-ghost text-xs px-2 py-1.5" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setResetTarget(r); setResetSenha(""); setResetConfirmar(""); setResetErr(""); }} className="btn-ghost text-xs px-2 py-1.5" title="Redefinir senha">
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleAtivo(r)} className="btn-ghost text-xs px-2 py-1.5" title={r.ativo ? "Desativar" : "Ativar"}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="app-card-elevated w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Novo acesso</h3>
              <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-2">
              {(["cliente", "funcionario"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNovoTipo(t)}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${novoTipo === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {t === "cliente" ? "Cliente" : "Funcionário"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="field-label">Nome *</label>
                <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={novoTipo === "cliente" ? "Nome da clínica/hospital" : "Nome completo"} />
              </div>

              {novoTipo === "cliente" ? (
                <div className="md:col-span-2">
                  <label className="field-label">Tipo *</label>
                  <div className="flex gap-3 mt-1">
                    {(["clinica", "hospital"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={tipoCliente === t} onChange={() => setTipoCliente(t)} className="accent-primary" />
                        <span className="text-sm text-foreground">{t === "clinica" ? "Clínica" : "Hospital"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="field-label">Perfil *</label>
                  <select className="field-select" value={perfil} onChange={(e) => setPerfil(e.target.value as any)}>
                    <option value="admin">Administrador</option>
                    <option value="motorista">Motorista</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>
              )}
              {novoTipo === "cliente" && (
                <div className="md:col-span-2">
                  <label className="field-label">Rota de coleta {tipoCliente === "clinica" ? "*" : "(opcional)"}</label>
                  <select className="field-select" value={rotaId} onChange={(e) => setRotaId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {rotas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome} — {r.periodo === "manha" ? "Manhã" : r.periodo === "tarde" ? "Tarde" : r.periodo === "livre" ? "Livre" : "—"}
                        {r.dias_semana && r.dias_semana.length > 0 ? ` — ${r.dias_semana.join(", ")}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="field-label">Email {novoTipo === "funcionario" ? "*" : ""}</label>
                <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {novoTipo === "cliente" && <p className="text-[11px] text-muted-foreground mt-1">Opcional</p>}
              </div>
              <div>
                <label className="field-label">Telefone</label>
                <input className="field-input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>

              <div>
                <label className="field-label">Senha *</label>
                <div className="relative">
                  <input className="field-input pr-10" type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Confirmar senha *</label>
                <input className="field-input" type={showSenha ? "text" : "password"} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
              </div>
            </div>

            {formErr && <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-semibold px-4 py-3">{formErr}</div>}

            <button className="btn-primary w-full btn-lg" onClick={handleCreate} disabled={saving}>
              {saving ? "Salvando..." : "Criar"}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditTarget(null)}>
          <div className="app-card-elevated w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Editar {editTarget.origem === "cliente" ? "cliente" : "funcionário"}</h3>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="field-label">Nome</label>
                <input className="field-input" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              {editTarget.origem === "cliente" ? (
                <div className="md:col-span-2">
                  <label className="field-label">Tipo</label>
                  <div className="flex gap-3 mt-1">
                    {(["clinica", "hospital"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={editTipo === t} onChange={() => setEditTipo(t)} className="accent-primary" />
                        <span className="text-sm text-foreground">{t === "clinica" ? "Clínica" : "Hospital"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="field-label">Perfil</label>
                  <select className="field-select" value={editPerfil} onChange={(e) => setEditPerfil(e.target.value as any)}>
                    <option value="admin">Administrador</option>
                    <option value="motorista">Motorista</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>
              )}
              {editTarget.origem === "cliente" && (
                <div className="md:col-span-2">
                  <label className="field-label">Rota de coleta</label>
                  <select className="field-select" value={editRotaId} onChange={(e) => setEditRotaId(e.target.value)}>
                    <option value="">Sem rota</option>
                    {rotas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome} — {r.periodo === "manha" ? "Manhã" : r.periodo === "tarde" ? "Tarde" : r.periodo === "livre" ? "Livre" : "—"}
                        {r.dias_semana && r.dias_semana.length > 0 ? ` — ${r.dias_semana.join(", ")}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editTarget.origem === "cliente" && (
                <div className="md:col-span-2">
                  <label className="field-label">Motorista de coleta</label>
                  <select className="field-select" value={editMotoristaId} onChange={(e) => setEditMotoristaId(e.target.value)}>
                    <option value="">Selecione o motorista</option>
                    {motoristas.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">Opcional — usado como fallback quando a rota não tem motorista.</p>
                </div>
              )}
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Telefone</label>
                <input className="field-input" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} />
              </div>
            </div>

            <button className="btn-primary w-full btn-lg" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setResetTarget(null)}>
          <div className="app-card-elevated w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Redefinir senha de {resetTarget.nome}</h3>
              <button onClick={() => setResetTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="field-label">Nova senha *</label>
              <input className="field-input" type="password" value={resetSenha} onChange={(e) => setResetSenha(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Confirmar senha *</label>
              <input className="field-input" type="password" value={resetConfirmar} onChange={(e) => setResetConfirmar(e.target.value)} />
            </div>

            {resetErr && <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-semibold px-4 py-3">{resetErr}</div>}

            <button className="btn-primary w-full btn-lg" onClick={handleResetPassword} disabled={resetting}>
              {resetting ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Acessos;