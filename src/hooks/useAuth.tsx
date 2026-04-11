import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "cliente" | "motorista" | "producao";
type LoginType = "cliente" | "funcionario";

interface Profile {
  nome: string;
  email: string;
  cliente_id: string | null;
  primeiro_acesso: boolean;
  username?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  profile: Profile | null;
  loginType: LoginType | null;
  signInCliente: (nomeClinica: string, password: string) => Promise<{ error: string | null }>;
  signInFuncionario: (identificador: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  markFirstAccessDone: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginType, setLoginType] = useState<LoginType | null>(null);

  const fetchUserData = async (userId: string) => {
    // Try usuarios first (funcionário)
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nome, email, perfil, cliente_id, primeiro_acesso, username")
      .eq("id", userId)
      .single();

    if (usuario) {
      const perfil = usuario.perfil as AppRole;
      setRole(perfil);
      setProfile({
        nome: usuario.nome,
        email: usuario.email,
        cliente_id: usuario.cliente_id,
        primeiro_acesso: usuario.primeiro_acesso,
        username: usuario.username,
      });
      if (perfil === "cliente") {
        setLoginType("cliente");
      } else {
        setLoginType("funcionario");
      }
      return;
    }

    // Try clientes (login de cliente direto)
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, email, primeiro_acesso")
      .eq("auth_user_id", userId)
      .single();

    if (cliente) {
      setRole("cliente");
      setLoginType("cliente");
      setProfile({
        nome: cliente.nome,
        email: cliente.email || "",
        cliente_id: cliente.id,
        primeiro_acesso: cliente.primeiro_acesso,
      });
      return;
    }

    setRole(null);
    setProfile(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoginType(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInCliente = async (nomeClinica: string, password: string): Promise<{ error: string | null }> => {
    // Lookup client auth email
    const { data, error: lookupError } = await supabase.rpc("buscar_cliente_por_nome", {
      _nome: nomeClinica,
    });

    if (lookupError || !data || data.length === 0) {
      // Register failed attempt
      await supabase.rpc("registrar_tentativa_login", { _nome_clinica: nomeClinica });
      return { error: "Nome da clínica ou senha incorretos." };
    }

    const result = data[0];
    if (result.bloqueado) {
      return { error: "Conta bloqueada por excesso de tentativas. Aguarde 10 minutos." };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.auth_email,
      password,
    });

    if (signInError) {
      await supabase.rpc("registrar_tentativa_login", { _nome_clinica: nomeClinica });
      return { error: "Nome da clínica ou senha incorretos." };
    }

    // Reset attempts on success
    await supabase.rpc("resetar_tentativas_login", { _nome_clinica: nomeClinica });
    setLoginType("cliente");
    return { error: null };
  };

  const signInFuncionario = async (identificador: string, password: string): Promise<{ error: string | null }> => {
    const { data, error: lookupError } = await supabase.rpc("buscar_funcionario_login", {
      _identificador: identificador,
    });

    if (lookupError || !data || data.length === 0) {
      return { error: "Email, usuário ou senha incorretos." };
    }

    const authEmail = data[0].auth_email;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      return { error: "Email, usuário ou senha incorretos." };
    }

    setLoginType("funcionario");
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
    setLoginType(null);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  };

  const markFirstAccessDone = () => {
    if (profile) {
      setProfile({ ...profile, primeiro_acesso: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        role,
        profile,
        loginType,
        signInCliente,
        signInFuncionario,
        signOut,
        updatePassword,
        markFirstAccessDone,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
