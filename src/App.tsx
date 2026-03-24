import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

import Login from "./pages/Login";
import SelectMesa from "./pages/SelectMesa";
import LotesProducao from "./pages/LotesProducao";
import Producao from "./pages/Producao";
import Dashboard from "./pages/admin/Dashboard";
import CriarLote from "./pages/admin/CriarLote";
import LoteStatus from "./pages/admin/LoteStatus";
import Embalagem from "./pages/admin/Embalagem";
import Clientes from "./pages/admin/Clientes";
import TiposRoupa from "./pages/admin/TiposRoupa";
import Relatorios from "./pages/admin/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Carregando...</p></div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Login />} />
    
    {/* Production (no auth needed) */}
    <Route path="/producao" element={<SelectMesa />} />
    <Route path="/producao/lotes" element={<LotesProducao />} />
    <Route path="/producao/lote/:lotId" element={<Producao />} />
    
    {/* Admin (auth required) */}
    <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
    <Route path="/admin/lote/novo" element={<AdminRoute><CriarLote /></AdminRoute>} />
    <Route path="/admin/lote/:lotId" element={<AdminRoute><LoteStatus /></AdminRoute>} />
    <Route path="/admin/lote/:lotId/embalar" element={<AdminRoute><Embalagem /></AdminRoute>} />
    <Route path="/admin/clientes" element={<AdminRoute><Clientes /></AdminRoute>} />
    <Route path="/admin/roupas" element={<AdminRoute><TiposRoupa /></AdminRoute>} />
    <Route path="/admin/relatorios" element={<AdminRoute><Relatorios /></AdminRoute>} />

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
