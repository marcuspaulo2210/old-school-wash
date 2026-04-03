import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import TiposRoupa from "./pages/admin/TiposRoupa";
import AdminPedidos from "./pages/admin/Pedidos";
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import MotoristaDashboard from "./pages/motorista/MotoristaDashboard";
import ProducaoDashboard from "./pages/producao/ProducaoDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading, role } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />

    {/* Admin */}
    <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/roupas" element={<ProtectedRoute allowedRoles={["admin"]}><TiposRoupa /></ProtectedRoute>} />
    <Route path="/admin/pedidos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPedidos /></ProtectedRoute>} />

    {/* Cliente */}
    <Route path="/cliente" element={<ProtectedRoute allowedRoles={["cliente"]}><ClienteDashboard /></ProtectedRoute>} />

    {/* Motorista */}
    <Route path="/motorista" element={<ProtectedRoute allowedRoles={["motorista"]}><MotoristaDashboard /></ProtectedRoute>} />

    {/* Produção */}
    <Route path="/producao" element={<ProtectedRoute allowedRoles={["producao"]}><ProducaoDashboard /></ProtectedRoute>} />

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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
