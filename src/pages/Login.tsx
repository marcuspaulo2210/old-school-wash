import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

type LoginTab = "cliente" | "funcionario";

const Login = () => {
  const { signInCliente, signInFuncionario, user, role, profile, loading, isProfileLoaded } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<LoginTab>("cliente");
  const [nomeClinica, setNomeClinica] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && isProfileLoaded && role) {
      if (profile?.primeiro_acesso) {
        navigate("/primeiro-acesso", { replace: true });
        return;
      }

      const routes: Record<string, string> = {
        admin: "/admin",
        cliente: "/cliente",
        motorista: "/motorista",
        producao: "/producao",
      };
      navigate(routes[role] || "/", { replace: true });
    }
  }, [user, role, profile, loading, isProfileLoaded, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (tab === "cliente") {
      if (!nomeClinica.trim()) {
        setError("Informe o nome da clínica.");
        setSubmitting(false);
        return;
      }
      const { error } = await signInCliente(nomeClinica.trim(), password);
      if (error) setError(error);
    } else {
      if (!identificador.trim()) {
        setError("Informe seu email ou nome de usuário.");
        setSubmitting(false);
        return;
      }
      const { error } = await signInFuncionario(identificador.trim(), password);
      if (error) setError(error);
    }

    setSubmitting(false);
  };

  return (
    <div className="app-container flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-extrabold text-primary-foreground font-mono">AM</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Amaná</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Lavanderia Hospitalar</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setTab("cliente"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "cliente"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Sou cliente
          </button>
          <button
            type="button"
            onClick={() => { setTab("funcionario"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "funcionario"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Sou funcionário
          </button>
        </div>

        {/* Form Card */}
        <div className="app-card-elevated">
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "cliente" ? (
              <div>
                <label className="field-label">Nome da clínica ou hospital</label>
                <input
                  type="text"
                  className="field-input"
                  value={nomeClinica}
                  onChange={(e) => setNomeClinica(e.target.value)}
                  placeholder="Ex: Clínica Bem Estar"
                  required
                  autoComplete="organization"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Digite o nome completo da sua clínica exatamente como foi cadastrado.
                </p>
              </div>
            ) : (
              <div>
                <label className="field-label">Email ou nome de usuário</label>
                <input
                  type="text"
                  className="field-input"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="email@amana.com ou joao.01"
                  required
                  autoComplete="username"
                />
              </div>
            )}

            <div>
              <label className="field-label">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="field-input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full btn-lg">
              {submitting ? "Aguarde..." : "Entrar"}
            </button>

            {tab === "cliente" && (
              <p className="text-xs text-center text-muted-foreground">
                Esqueceu a senha?{" "}
                <span className="text-primary font-medium cursor-pointer hover:underline">
                  Entre em contato com a Amaná Lavanderia Hospitalar.
                </span>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
