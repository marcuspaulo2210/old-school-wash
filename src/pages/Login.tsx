import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError("Erro ao criar conta. Tente novamente.");
      } else {
        setSuccess("Conta criada! Entrando...");
        const { error: signInError } = await signIn(email, password);
        if (!signInError) navigate("/admin");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError("Email ou senha incorretos.");
      } else {
        navigate("/admin");
      }
    }
    setLoading(false);
  };

  return (
    <div className="app-container flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-black text-primary-foreground">A</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Amaná</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Lavanderia Hospitalar</p>
        </div>

        {/* Login card */}
        <div className="app-card-elevated">
          <h2 className="text-base font-bold text-foreground mb-5">
            {isSignUp ? "Criar conta" : "Acesso administrativo"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-success/10 text-success text-sm font-medium px-4 py-3">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? (isSignUp ? "Criando..." : "Entrando...") : (isSignUp ? "Criar conta" : "Entrar")}
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

        {/* Production access */}
        <div className="mt-4">
          <button
            className="btn-secondary w-full btn-lg"
            onClick={() => navigate("/producao")}
          >
            🏭 Acesso Produção
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">Acesso rápido sem senha</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
