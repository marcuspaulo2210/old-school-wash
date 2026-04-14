import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Search, X, Eye, EyeOff, LogIn, Check, Key, Bell, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  cliente_id: string | null;
  permite_cobranca_peca: boolean;
  permite_cobranca_peso: boolean;
  quantidade_trocas_senha: number;
  clientes?: { nome: string } | null;
}

interface Cliente { id: string; nome: string; }

const perfilBadge: Record<string, string> = {
  admin: "badge-purple",
  cliente: "badge-teal",
  motorista: "badge-warning",
  producao: "badge-primary",
};

const perfilLabel: Record<string, string> = {
  admin: "Admin",
  cliente: "Cliente",
  motorista: "Motorista",
  producao: "Produção",
};

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

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Form
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<string>("cliente");
  const [clienteId, setClienteId] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [senhaError, setSenhaError] = useState("");

  // Password reset
  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [resetSenha, setResetSenha] = useState("");
  const [resetConfirmar, setResetConfirmar] = useState("");
  const [showResetSenha, setShowResetSenha] = useState(false);
  const [showResetConfirmar, setShowResetConfirmar] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  // Password change requests
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);

  const navigate = useNavigate();

  const fetchAll = async () => {
    const [{ data: users }, { data: cls }, { data: solic }] = await Promise.all([
      supabase.from("usuarios").select("id, nome, email, perfil, ativo, cliente_id, permite_cobranca_peca, permite_cobranca_peso, quantidade_trocas_senha, clientes(nome)").order("nome"),
      supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("solicitacoes_troca_senha").select("*").eq("status", "pendente").order("criado_em", { ascending: false }),
    ]);
    setUsuarios((users as unknown as Usuario[]) || []);
    setClientes((cls as unknown as Cliente[]) || []);
    setSolicitacoes((solic as any) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setNome(""); setEmail(""); setPerfil("cliente"); setClienteId("");
    setSenha(""); setConfirmarSenha(""); setSenhaError(""); setShowSenha(false); setShowConfirmar(false);
  };

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim()) return;
    if (!senha) { setSenhaError("Informe uma senha"); return; }
    if (senha !== confirmarSenha) { setSenhaError("As senhas não coincidem"); return; }
    if (senha.length < 6) { setSenhaError("Senha deve ter pelo menos 6 caracteres"); return; }
    setSenhaError("");
    setSaving(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { name: nome } },
    });

    if (error || !data.user) {
      setSaving(false);
      setSenhaError(error?.message || "Erro ao criar usuário");
      return;
    }

    await supabase.from("usuarios").upsert({
      id: data.user.id,
      nome: nome.trim(),
      email,
      perfil: perfil as any,
      cliente_id: (perfil === "cliente" && clienteId) ? clienteId : null,
    } as any);

    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchAll();
  };

  const toggleAtivo = async (u: Usuario) => {
    await supabase.from("usuarios").update({ ativo: !u.ativo } as any).eq("id", u.id);
    fetchAll();
  };

  const handleImpersonate = async (u: Usuario) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.from("log_impersonacao").insert({
        admin_id: currentUser.id,
        usuario_alvo_id: u.id,
      } as any);
    }

    localStorage.setItem("amana_impersonating", JSON.stringify({
      usuario_id: u.id,
      usuario_nome: u.nome,
      usuario_perfil: u.perfil,
      usuario_cliente_id: u.cliente_id,
    }));

    const dashboardMap: Record<string, string> = {
      cliente: "/cliente",
      motorista: "/motorista",
      producao: "/producao",
      admin: "/admin",
    };
    navigate(dashboardMap[u.perfil] || "/admin");
  };

  const toggleCobranca = async (u: Usuario, field: "permite_cobranca_peca" | "permite_cobranca_peso") => {
    await supabase.from("usuarios").update({ [field]: !u[field] } as any).eq("id", u.id);
    fetchAll();
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!resetSenha) { setResetError("Informe a nova senha"); return; }
    if (resetSenha !== resetConfirmar) { setResetError("As senhas não coincidem"); return; }
    if (resetSenha.length < 6) { setResetError("Mínimo 6 caracteres"); return; }
    setResetting(true);
    setResetError("");

    // Call edge function to reset password
    const { error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: resetTarget.id, new_password: resetSenha },
    });

    if (error) {
      setResetError("Erro ao redefinir senha. Tente novamente.");
      setResetting(false);
      return;
    }

    // Reset counter
    await supabase.from("usuarios").update({ quantidade_trocas_senha: 0 } as any).eq("id", resetTarget.id);

    setResetting(false);
    setResetTarget(null);
    setResetSenha("");
    setResetConfirmar("");
    fetchAll();
  };

  const handleApproveSolicitacao = async (solicId: string, userId: string) => {
    // Authorize +1 change: reset counter to 1 (allows one more change)
    await supabase.from("usuarios").update({ quantidade_trocas_senha: 1 } as any).eq("id", userId);
    await supabase.from("solicitacoes_troca_senha").update({ status: "aprovada", resolvido_em: new Date().toISOString(), resolvido_por: (await supabase.auth.getUser()).data.user?.id } as any).eq("id", solicId);
    fetchAll();
  };

  const handleRejectSolicitacao = async (solicId: string) => {
    await supabase.from("solicitacoes_troca_senha").update({ status: "rejeitada", resolvido_em: new Date().toISOString(), resolvido_por: (await supabase.auth.getUser()).data.user?.id } as any).eq("id", solicId);
    fetchAll();
  };

  const handleZerarContador = async (userId: string) => {
    await supabase.from("usuarios").update({ quantidade_trocas_senha: 0 } as any).eq("id", userId);
    fetchAll();
  };

  const strength = getPasswordStrength(senha);
  const resetStrength = getPasswordStrength(resetSenha);

  const filtered = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Usuários" subtitle="Gerenciamento de acessos">
      {/* Form */}
      {showForm && (
        <div className="app-card-elevated mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Novo Usuário</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome completo *</label>
              <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Email (login) *</label>
              <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Senha inicial *</label>
              <div className="relative">
                <input
                  className="field-input pr-10"
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setSenhaError(""); }}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
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
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmar(!showConfirmar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmarSenha && senha !== confirmarSenha && (
                <p className="text-[11px] mt-1 text-destructive font-semibold">As senhas não coincidem</p>
              )}
            </div>
            <div>
              <label className="field-label">Perfil</label>
              <select className="field-select" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                <option value="admin">Administrador</option>
                <option value="cliente">Cliente</option>
                <option value="motorista">Motorista</option>
                <option value="producao">Produção</option>
              </select>
            </div>
            {perfil === "cliente" && (
              <div>
                <label className="field-label">Vincular a cliente</label>
                <select className="field-select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          {senhaError && <p className="text-xs text-destructive font-semibold">{senhaError}</p>}

          <button className="btn-primary w-full btn-lg" onClick={handleCreate} disabled={saving}>
            {saving ? "Criando..." : "Criar usuário"}
          </button>
        </div>
      )}

      {!showForm && (
        <button className="btn-primary text-xs px-3 py-2 mb-4" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      )}

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Pending password change requests */}
      {solicitacoes.length > 0 && (
        <div className="app-card-elevated mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "#f0a020" }} />
            <h3 className="text-sm font-bold text-foreground">Solicitações de troca de senha ({solicitacoes.length})</h3>
          </div>
          {solicitacoes.map((s: any) => {
            const user = usuarios.find((u) => u.id === s.user_id);
            return (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">{user?.nome || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email} • Solicitado em {new Date(s.criado_em).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-xs px-3 py-1.5"
                    onClick={() => handleApproveSolicitacao(s.id, s.user_id)}
                    title="Autorizar +1 troca"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Autorizar
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() => {
                      setResetTarget(user || null);
                      setResetSenha("");
                      setResetConfirmar("");
                      setResetError("");
                    }}
                    title="Redefinir senha manualmente"
                  >
                    <Key className="w-3.5 h-3.5 mr-1" /> Redefinir
                  </button>
                  <button
                    className="text-xs px-2 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    onClick={() => handleRejectSolicitacao(s.id)}
                    title="Rejeitar solicitação"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className={`app-card ${!u.ativo ? "opacity-40" : ""}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">{u.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {u.email} {u.clientes?.nome ? `• ${u.clientes.nome}` : ""}
                  {u.quantidade_trocas_senha >= 2 && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(224,80,80,0.12)", color: "#e05050" }}>Limite de trocas</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={perfilBadge[u.perfil] || "badge-neutral"}>{perfilLabel[u.perfil] || u.perfil}</span>
                <button onClick={() => toggleAtivo(u)} className={u.ativo ? "badge-success" : "badge-neutral"}>
                  {u.ativo ? "Ativo" : "Inativo"}
                </button>
                <button
                  onClick={() => handleImpersonate(u)}
                  className="btn-ghost text-xs px-2 py-1.5"
                  title="Acessar como este usuário"
                >
                  <LogIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setResetTarget(u); setResetSenha(""); setResetConfirmar(""); setResetError(""); }}
                  className="btn-ghost text-xs px-2 py-1.5"
                  title="Redefinir senha"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                {u.perfil === "cliente" && (
                  <button onClick={() => setEditingUser(editingUser?.id === u.id ? null : u)} className="btn-ghost text-xs px-2 py-1.5">
                    Permissões
                  </button>
                )}
              </div>
            </div>

            {/* Permissions panel for cliente */}
            {editingUser?.id === u.id && u.perfil === "cliente" && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissões de cobrança</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => toggleCobranca(u, "permite_cobranca_peca")}
                    className={`w-9 h-5 rounded-full transition-colors relative ${u.permite_cobranca_peca ? "bg-primary" : "bg-secondary"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${u.permite_cobranca_peca ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <span className="text-sm text-foreground">Permite cobrança por peça</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => toggleCobranca(u, "permite_cobranca_peso")}
                    className={`w-9 h-5 rounded-full transition-colors relative ${u.permite_cobranca_peso ? "bg-primary" : "bg-secondary"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${u.permite_cobranca_peso ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <span className="text-sm text-foreground">Permite cobrança por peso</span>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Password reset modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Redefinir senha</h3>
              <button onClick={() => setResetTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Redefinir senha de <strong className="text-foreground">{resetTarget.nome}</strong></p>
            
            <div>
              <label className="field-label">Nova senha</label>
              <div className="relative">
                <input className="field-input pr-10" type={showResetSenha ? "text" : "password"} value={resetSenha} onChange={(e) => { setResetSenha(e.target.value); setResetError(""); }} />
                <button type="button" onClick={() => setShowResetSenha(!showResetSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {resetSenha && (
                <div className="mt-2 space-y-1">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${resetStrength.percent}%`, background: resetStrength.color }} />
                  </div>
                  <p className="text-[11px] font-semibold" style={{ color: resetStrength.color }}>{resetStrength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="field-label">Confirmar senha</label>
              <div className="relative">
                <input className="field-input pr-10" type={showResetConfirmar ? "text" : "password"} value={resetConfirmar} onChange={(e) => { setResetConfirmar(e.target.value); setResetError(""); }} />
                <button type="button" onClick={() => setShowResetConfirmar(!showResetConfirmar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {resetError && <p className="text-xs text-destructive font-semibold">{resetError}</p>}

            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setResetTarget(null)}>Cancelar</button>
              <button className="btn-primary flex-1" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Salvando..." : "Redefinir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Usuarios;
