-- 00007_storage.sql
-- Bucket privado das fotografias e politicas de acesso (Secao 17.1).
--
-- Caminho obrigatorio: <auth.uid()>/<watch_id>/<uuid>.<ext>
-- As politicas comparam o primeiro segmento do caminho com auth.uid(), entao
-- ninguem le nem grava dentro da pasta de outro usuario.
--
-- O upload e a remocao sempre passam pela Storage API; storage.objects nunca e
-- alterado diretamente pela aplicacao.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wata-watch-photos',
  'wata-watch-photos',
  false,
  10485760, -- 10 MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Politicas por objeto.
--
-- storage.foldername(name) devolve os segmentos do caminho; a posicao 1 e a
-- pasta raiz, que precisa ser o id do usuario autenticado.
-- ---------------------------------------------------------------------------
drop policy if exists "fotos: ler as proprias" on storage.objects;
create policy "fotos: ler as proprias"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'wata-watch-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "fotos: enviar na propria pasta" on storage.objects;
create policy "fotos: enviar na propria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wata-watch-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "fotos: atualizar as proprias" on storage.objects;
create policy "fotos: atualizar as proprias"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'wata-watch-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'wata-watch-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "fotos: remover as proprias" on storage.objects;
create policy "fotos: remover as proprias"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wata-watch-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
