import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Search, X } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  cliente_id: string | null;
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

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
};

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedPw, setGeneratedPw] = useState<string | null>(null);

  // Form
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<string>("cliente");
  const [clienteId, setClienteId] = useState("");
  const [telefone, setTelefone] = useState("");

  const fetchAll = async () => {
    const [{ data: users }, { data: cls }] = await Promise.all([
      supabase.from("usuarios").select("id, nome, email, perfil, ativo, cliente_id, clientes(nome)").order("nome"),
      supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setUsuarios((users as unknown as Usuario[]) || []);
    setClientes((cls as unknown as Cliente[]) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim()) return;
    setSaving(true);
    const pw = generatePassword();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { name: nome } },
    });

    if (error || !data.user) {
      setSaving(false);
      return;
    }

    // The trigger/function should create the usuario record, but let's also insert directly
    await supabase.from("usuarios").upsert({
      id: data.user.id,
      nome: nome.trim(),
      email,
      perfil: perfil as any,
      cliente_id: (perfil === "cliente" && clienteId) ? clienteId : null,
    } as any);

    setSaving(false);
    setGeneratedPw(pw);
  };

  const toggleAtivo = async (u: Usuario) => {
    await supabase.from("usuarios").update({ ativo: !u.ativo } as any).eq("id", u.id);
    fetchAll();
  };

  const filtered = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Usuários" subtitle="Gerenciamento de acessos">
      {/* Generated password display */}
      {generatedPw && (
        <div className="app-card-elevated mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold" style={{ color: "#34c97a" }}>✓ Usuário criado com sucesso</h3>
            <button onClick={() => { setGeneratedPw(null); setShowForm(false); setNome(""); setEmail(""); fetchAll(); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-muted-foreground">Senha gerada (exibida apenas uma vez):</p>
          <div className="bg-background rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground text-center select-all">{generatedPw}</div>
          <p className="text-xs text-muted-foreground">Anote esta senha e envie ao usuário.</p>
        </div>
      )}

      {/* Form */}
      {showForm && !generatedPw && (
        <div className="app-card-elevated mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Novo Usuário</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
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
          <p className="text-xs text-muted-foreground">A senha será gerada automaticamente e exibida uma única vez.</p>
          <button className="btn-primary w-full btn-lg" onClick={handleCreate} disabled={saving}>
            {saving ? "Criando..." : "Criar usuário"}
          </button>
        </div>
      )}

      {!showForm && !generatedPw && (
        <button className="btn-primary text-xs px-3 py-2 mb-4" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      )}

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className={`list-item ${!u.ativo ? "opacity-40" : ""}`}>
            <div>
              <div className="text-sm font-bold text-foreground">{u.nome}</div>
              <div className="text-xs text-muted-foreground">{u.email} {u.clientes?.nome ? `• ${u.clientes.nome}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={perfilBadge[u.perfil] || "badge-neutral"}>{perfilLabel[u.perfil] || u.perfil}</span>
              <button onClick={() => toggleAtivo(u)} className={u.ativo ? "badge-success" : "badge-neutral"}>
                {u.ativo ? "Ativo" : "Inativo"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Usuarios;
