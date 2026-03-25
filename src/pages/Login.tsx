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
        // Auto-confirm is on, so sign in immediately
        const { error: signInError } = await signIn(email, password);
        if (!signInError) {
          navigate("/admin");
        }
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="paper-sheet p-6 w-full max-w-sm">
        <div className="text-center mb-6 border-b border-foreground pb-3">
          <h1 className="text-xl font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">LAVANDERIA HOSPITALAR</p>
          <p className="text-[10px] text-muted-foreground mt-1">ACESSO ADMINISTRATIVO</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-sm block mb-1">Email:</label>
            <div className="paper-field w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="font-bold text-sm block mb-1">Senha:</label>
            <div className="paper-field w-full">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <p className="text-destructive text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-paper btn-paper-primary w-full"
          >
            {loading ? "ENTRANDO..." : "ENTRAR"}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-t border-border">
          <button
            className="btn-paper w-full text-xs"
            onClick={() => navigate("/producao")}
          >
            ACESSO PRODUÇÃO (SEM SENHA)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
