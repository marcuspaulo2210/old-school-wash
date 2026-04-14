import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const getStrength = (pw: string): { label: string; color: string; level: number } => {
  if (pw.length < 6) return { label: "Muito curta", color: "hsl(var(--destructive))", level: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Fraca", color: "hsl(var(--destructive))", level: 1 };
  if (score <= 2) return { label: "Média", color: "hsl(var(--warning))", level: 2 };
  return { label: "Forte", color: "hsl(var(--success))", level: 3 };
};

const PrimeiroAcesso = () => {
  const { user, role, profile, updatePassword, markFirstAccessDone, loginType } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = getStrength(password);
  const passwordsMatch = password === confirm && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);

    const { error: pwError } = await updatePassword(password);
    if (pwError) {
      setError("Erro ao atualizar senha. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // Mark primeiro_acesso = false in database (this change does NOT count towards the 2-change limit)
    if (user) {
      if (loginType === "cliente" && profile?.cliente_id) {
        await supabase
          .from("clientes")
          .update({ primeiro_acesso: false } as any)
          .eq("id", profile.cliente_id);
      } else {
        await supabase
          .from("usuarios")
          .update({ primeiro_acesso: false } as any)
          .eq("id", user.id);
      }
    }

    markFirstAccessDone();

    // Redirect
    const routes: Record<string, string> = {
      admin: "/admin",
      cliente: "/cliente",
      motorista: "/motorista",
      producao: "/producao",
    };
    navigate(routes[role || ""] || "/");
  };

  return (
    <div className="app-container flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Crie sua senha pessoal</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Olá, <span className="text-foreground">{profile?.nome}</span>! Este é o seu primeiro acesso.
          </p>
        </div>

        <div className="app-card-elevated">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Nova senha</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="field-input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{
                          backgroundColor: i <= strength.level ? strength.color : "hsl(var(--border))",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="field-label">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="field-input pr-10"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-destructive mt-1">As senhas não conferem.</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !passwordsMatch}
              className="btn-primary w-full btn-lg"
            >
              {submitting ? "Salvando..." : "Criar senha e continuar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Essa troca é obrigatória e não conta no seu limite de alterações.
        </p>
      </div>
    </div>
  );
};

export default PrimeiroAcesso;
