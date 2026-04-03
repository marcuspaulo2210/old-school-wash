import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { signIn, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      const routes: Record<string, string> = {
        admin: "/admin",
        cliente: "/cliente",
        motorista: "/motorista",
        producao: "/producao",
      };
      navigate(routes[role] || "/");
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (isSignUp) {
      if (!name.trim()) { setError("Informe seu nome."); setSubmitting(false); return; }
      const { error } = await signUp(email, password, name.trim());
      if (error) {
        setError("Erro ao criar conta. Tente novamente.");
      } else {
        setSuccess("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError("Email ou senha incorretos.");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="app-container flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-extrabold text-primary-foreground font-mono">LA</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">LavaApp</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Lavanderia Industrial</p>
        </div>

        {/* Form card */}
        <div className="app-card-elevated">
          <h2 className="text-base font-bold text-foreground mb-5">
            {isSignUp ? "Criar conta" : "Entrar"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="field-label">Nome</label>
                <input
                  type="text"
                  className="field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            )}
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="field-label">Senha</label>
              <input
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg text-sm font-medium px-4 py-3" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full btn-lg">
              {submitting ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </button>

            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground font-medium w-full text-center transition-colors"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
            >
              {isSignUp ? "Já tem conta? Entrar" : "Criar nova conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Novos cadastros recebem acesso como <span className="text-foreground font-medium">cliente</span>.
          <br />O administrador pode alterar perfis.
        </p>
      </div>
    </div>
  );
};

export default Login;
