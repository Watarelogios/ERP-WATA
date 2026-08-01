-- 00002_profiles_auth.sql
-- Perfis, criacao automatica apos signup e funcao compartilhada de updated_at.

-- ---------------------------------------------------------------------------
-- Mantem updated_at coerente sem depender da aplicacao.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: carimba updated_at no servidor.';

-- ---------------------------------------------------------------------------
-- profiles (Secao 10.1)
-- O id espelha auth.users.id, entao as politicas de RLS comparam id = auth.uid().
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  role public.role_type not null default 'ADMIN',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil do usuario. O MVP possui apenas o papel ADMIN (Secao 4.1).';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cria o profile assim que um usuario entra em auth.users.
--
-- security definer porque o trigger roda no contexto do Auth, que nao tem
-- permissao no schema public. search_path fixo evita sequestro de resolucao
-- de nomes por objetos criados em schemas do usuario.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    -- raw_user_meta_data e opcional e vem do cliente: tratar como ausente.
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Usuarios criados antes desta migration tambem precisam de profile.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, nome)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'nome'), ''), '')
from auth.users u
on conflict (id) do nothing;
