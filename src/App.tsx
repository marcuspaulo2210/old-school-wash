import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "./components/BottomNav";
import FichaColeta from "./pages/FichaColeta";
import FichaEntrega from "./pages/FichaEntrega";
import Historico from "./pages/Historico";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="pb-16">
          <Routes>
            <Route path="/" element={<FichaColeta />} />
            <Route path="/entrega/:id" element={<FichaEntrega />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
