
-- Enum for lot status
CREATE TYPE public.lot_status AS ENUM ('em_producao', 'finalizado', 'conferido');

-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'producao');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Clients table (hospitals/clinics)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'clinica')),
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Clothing types table
CREATE TABLE public.clothing_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'PEÇA' CHECK (unit IN ('PEÇA', 'CONJUNTO')),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clothing_types ENABLE ROW LEVEL SECURITY;

-- Lots table (replaces physical paper pads)
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  lot_number SERIAL,
  status lot_status NOT NULL DEFAULT 'em_producao',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  notes TEXT
);
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- Production entries (each item counted at a mesa)
CREATE TABLE public.production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  clothing_type_id UUID NOT NULL REFERENCES public.clothing_types(id) ON DELETE RESTRICT,
  mesa TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;

-- Packaging/verification entries
CREATE TABLE public.packaging_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  clothing_type_id UUID NOT NULL REFERENCES public.clothing_types(id) ON DELETE RESTRICT,
  quantity_packed INT NOT NULL DEFAULT 0 CHECK (quantity_packed >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packaging_entries ENABLE ROW LEVEL SECURITY;

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_entries_updated_at BEFORE UPDATE ON public.production_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packaging_entries_updated_at BEFORE UPDATE ON public.packaging_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- user_roles: users can see their own roles, admins can manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- clients: authenticated users can read, admins can manage
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- clothing_types: everyone can read, admins manage
CREATE POLICY "Anyone can view clothing types" ON public.clothing_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clothing types" ON public.clothing_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update clothing types" ON public.clothing_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete clothing types" ON public.clothing_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- lots: authenticated can read and create, admins can delete
CREATE POLICY "Authenticated can view lots" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create lots" ON public.lots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update lots" ON public.lots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete lots" ON public.lots FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- production_entries: authenticated can read/create/update
CREATE POLICY "Authenticated can view entries" ON public.production_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create entries" ON public.production_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update entries" ON public.production_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete entries" ON public.production_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- packaging_entries: authenticated can read/create/update
CREATE POLICY "Authenticated can view packaging" ON public.packaging_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create packaging" ON public.packaging_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update packaging" ON public.packaging_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete packaging" ON public.packaging_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default clothing types
INSERT INTO public.clothing_types (name, unit, sort_order) VALUES
  ('Blusa / Camisa', 'PEÇA', 1),
  ('Calça', 'PEÇA', 2),
  ('Camisola Transpassada', 'PEÇA', 3),
  ('Campo Grande', 'PEÇA', 4),
  ('Campo Médio', 'PEÇA', 5),
  ('Campo Pequeno', 'PEÇA', 6),
  ('Campo Grande c/ Fenestra', 'PEÇA', 7),
  ('Campo Pequeno c/ Fenestra', 'PEÇA', 8),
  ('Capa para Microscópio', 'PEÇA', 9),
  ('Capote Cirúrgico', 'PEÇA', 10),
  ('Cobertor Grande', 'PEÇA', 11),
  ('Cobertor Pequeno', 'PEÇA', 12),
  ('Colcha Grande', 'PEÇA', 13),
  ('Colcha Pequena', 'PEÇA', 14),
  ('Compressa 0,35 x 0,36', 'PEÇA', 15),
  ('Compressa 0,50 x 0,70', 'PEÇA', 16),
  ('Edredom', 'PEÇA', 17),
  ('Fronha', 'PEÇA', 18),
  ('Gorro / Touca', 'PEÇA', 19),
  ('Impermeável (Napa)', 'PEÇA', 20),
  ('Jaleco Médico', 'PEÇA', 21),
  ('Lençol Liso', 'PEÇA', 22),
  ('Lençol com Elástico', 'PEÇA', 23),
  ('Pano de Chão', 'PEÇA', 24),
  ('Pano de Prato', 'PEÇA', 25),
  ('Pijama Paciente', 'CONJUNTO', 26),
  ('Piso', 'PEÇA', 27),
  ('Saco Duplo de Algodão (Hamper)', 'PEÇA', 28),
  ('Sapatilha', 'PEÇA', 29),
  ('Short', 'PEÇA', 30),
  ('Tapete Grande', 'PEÇA', 31),
  ('Tapete Pequeno', 'PEÇA', 32),
  ('Toalha de Banho', 'PEÇA', 33),
  ('Toalha de Rosto', 'PEÇA', 34),
  ('Toalha de Mão', 'PEÇA', 35),
  ('Traçado', 'PEÇA', 36),
  ('Travesseiro', 'PEÇA', 37),
  ('Almofada', 'PEÇA', 38);
