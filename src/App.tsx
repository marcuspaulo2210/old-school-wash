import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ImpersonationBar from "@/components/ImpersonationBar";

import Login from "./pages/Login";
import AlterarSenha from "./pages/AlterarSenha";
import AdminDashboard from "./pages/admin/Dashboard";
import TiposRoupa from "./pages/admin/TiposRoupa";
import AdminPedidos from "./pages/admin/Pedidos";
import Acessos from "./pages/admin/Acessos";
import Servicos from "./pages/admin/Servicos";
import Rotas from "./pages/admin/Rotas";
import Divergencias from "./pages/admin/Divergencias";
import Analise from "./pages/admin/Analise";
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import MotoristaDashboard from "./pages/motorista/MotoristaDashboard";
import ProducaoDashboard from "./pages/producao/ProducaoDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading, isProfileLoaded, role } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!isProfileLoaded) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  // Allow admin to access any route when impersonating
  const isImpersonating = !!localStorage.getItem("amana_impersonating");
  if (allowedRoles && role && !allowedRoles.includes(role) && !isImpersonating) return <Navigate to="/" replace />;
  if (isImpersonating && role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/alterar-senha" element={<ProtectedRoute><AlterarSenha /></ProtectedRoute>} />

    {/* Admin */}
    <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/roupas" element={<ProtectedRoute allowedRoles={["admin"]}><TiposRoupa /></ProtectedRoute>} />
    <Route path="/admin/pedidos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPedidos /></ProtectedRoute>} />
    <Route path="/admin/acessos" element={<ProtectedRoute allowedRoles={["admin"]}><Acessos /></ProtectedRoute>} />
    <Route path="/admin/clientes" element={<Navigate to="/admin/acessos" replace />} />
    <Route path="/admin/usuarios" element={<Navigate to="/admin/acessos" replace />} />
    <Route path="/admin/servicos" element={<ProtectedRoute allowedRoles={["admin"]}><Servicos /></ProtectedRoute>} />
    <Route path="/admin/rotas" element={<ProtectedRoute allowedRoles={["admin"]}><Rotas /></ProtectedRoute>} />
    <Route path="/admin/divergencias" element={<ProtectedRoute allowedRoles={["admin"]}><Divergencias /></ProtectedRoute>} />
    <Route path="/admin/analise" element={<ProtectedRoute allowedRoles={["admin"]}><Analise /></ProtectedRoute>} />

    {/* Cliente */}
    <Route path="/cliente" element={<ProtectedRoute allowedRoles={["cliente", "admin"]}><ClienteDashboard /></ProtectedRoute>} />

    {/* Motorista */}
    <Route path="/motorista" element={<ProtectedRoute allowedRoles={["motorista", "admin"]}><MotoristaDashboard /></ProtectedRoute>} />

    {/* Produção */}
    <Route path="/producao" element={<ProtectedRoute allowedRoles={["producao", "admin"]}><ProducaoDashboard /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationBar />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
