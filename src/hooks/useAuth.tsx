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
  isProfileLoaded: boolean;
  role: AppRole | null;
  profile: Profile | null;
  loginType: LoginType | null;
  signInCliente: (nomeClinica: string, password: string) => Promise<{ error: string | null }>;
  signInFuncionario: (identificador: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginType, setLoginType] = useState<LoginType | null>(null);

  const fetchUserData = async (userId: string) => {
    setIsProfileLoaded(false);

    // Fetch both in parallel; clientes wins when present (login por nome da clínica)
    const [{ data: usuario }, { data: cliente }] = await Promise.all([
      supabase
        .from("usuarios")
        .select("nome, email, perfil, cliente_id, primeiro_acesso, username")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("clientes")
        .select("id, nome, email, primeiro_acesso")
        .eq("auth_user_id", userId)
        .maybeSingle(),
    ]);

    // Prefer clientes record when this auth user is linked to a cliente
    if (cliente) {
      setRole("cliente");
      setLoginType("cliente");
      setProfile({
        nome: cliente.nome,
        email: cliente.email || "",
        cliente_id: cliente.id,
        primeiro_acesso: false,
      });
      setIsProfileLoaded(true);
      return;
    }

    if (usuario) {
      const perfil = usuario.perfil as AppRole;
      setRole(perfil);
      setProfile({
        nome: usuario.nome,
        email: usuario.email,
        cliente_id: usuario.cliente_id,
        primeiro_acesso: false,
        username: usuario.username,
      });
      setLoginType(perfil === "cliente" ? "cliente" : "funcionario");
      setIsProfileLoaded(true);
      return;
    }

    setRole(null);
    setProfile(null);
    setIsProfileLoaded(true);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setIsProfileLoaded(false);
          setTimeout(async () => {
            await fetchUserData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoginType(null);
          setIsProfileLoaded(true);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsProfileLoaded(false);
        await fetchUserData(session.user.id);
      } else {
        setIsProfileLoaded(true);
      }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isProfileLoaded,
        role,
        profile,
        loginType,
        signInCliente,
        signInFuncionario,
        signOut,
        updatePassword,
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
