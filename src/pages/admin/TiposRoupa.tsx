import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, X } from "lucide-react";

interface TipoRoupa {
  id: string;
  nome: string;
  ativo: boolean;
  criado_por_admin: boolean;
  cliente_id: string | null;
  clientes?: { nome: string } | null;
}

interface Hospital { id: string; nome: string; }

const TiposRoupa = () => {
  const [types, setTypes] = useState<TipoRoupa[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [precoUnit, setPrecoUnit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [{ data: t }, { data: h }] = await Promise.all([
      supabase.from("tipos_roupa").select("id, nome, ativo, criado_por_admin, cliente_id, clientes(nome)").order("nome"),
      supabase.from("clientes").select("id, nome").eq("tipo", "hospital").eq("ativo", true).order("nome"),
    ]);
    setTypes((t as unknown as TipoRoupa[]) || []);
    setHospitals((h as unknown as Hospital[]) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    const payload: any = { nome: nome.trim(), criado_por_admin: true, cliente_id: hospitalId || null };
    if (editingId) {
      await supabase.from("tipos_roupa").update(payload).eq("id", editingId);
    } else {
      await supabase.from("tipos_roupa").insert(payload);
    }
    setNome(""); setHospitalId(""); setPrecoUnit(""); setEditingId(null); setShowForm(false);
    setSaving(false);
    fetchAll();
  };

  const openEdit = (t: TipoRoupa) => {
    setEditingId(t.id);
    setNome(t.nome);
    setHospitalId(t.cliente_id || "");
    setShowForm(true);
  };

  const toggleActive = async (t: TipoRoupa) => {
    await supabase.from("tipos_roupa").update({ ativo: !t.ativo } as any).eq("id", t.id);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tipos_roupa").delete().eq("id", id);
    fetchAll();
  };

  // Group by hospital
  const grouped = types.reduce((acc: Record<string, TipoRoupa[]>, t) => {
    const key = t.clientes?.nome || "Geral (sem hospital)";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <AdminLayout
      title="Tipos de Roupa"
      subtitle="Cadastro exclusivo do administrador"
      actions={
        <button className="btn-primary text-xs px-3 py-2" onClick={() => { setEditingId(null); setNome(""); setHospitalId(""); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4" /> Novo
        </button>
      }
    >
      {showForm && (
        <div className="app-card-elevated mb-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">{editingId ? "Editar" : "Novo tipo de roupa"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome da peça *</label>
              <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lençol, Toalha..." />
            </div>
            <div>
              <label className="field-label">Hospital</label>
              <select className="field-select" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
                <option value="">Geral (todos)</option>
                {hospitals.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary w-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {Object.keys(grouped).length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">👕</div><p className="empty-state-text">Nenhum tipo cadastrado</p></div>
        )}
        {Object.entries(grouped).map(([hospital, items]) => (
          <div key={hospital}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{hospital}</h3>
            <div className="space-y-1">
              {items.map((t) => (
                <div key={t.id} className={`list-item ${!t.ativo ? "opacity-40" : ""}`}>
                  <div className="text-sm font-medium text-foreground">{t.nome}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(t)} className={t.ativo ? "badge-success text-[10px]" : "badge-neutral text-[10px]"}>
                      {t.ativo ? "Ativo" : "Inativo"}
                    </button>
                    <button onClick={() => openEdit(t)} className="text-xs text-muted-foreground hover:text-foreground">Editar</button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-destructive hover:text-destructive/80">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default TiposRoupa;
