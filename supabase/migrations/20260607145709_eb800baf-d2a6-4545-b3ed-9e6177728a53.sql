CREATE POLICY "Motorista ve clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (tem_perfil(auth.uid(), 'motorista'::perfil_usuario));