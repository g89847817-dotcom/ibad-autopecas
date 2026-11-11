
-- iBAD Autopecas | Migration 004
-- Preparacao do gerenciamento de vendedores

-- Identificacao de login e controle de acesso
alter table public.perfis
  add column if not exists usuario text,
  add column if not exists ativo boolean not null default true;

-- Impede usuarios duplicados, inclusive com letras maiusculas/minusculas
create unique index if not exists perfis_usuario_unico
on public.perfis (lower(usuario))
where usuario is not null;

-- Somente membros ativos da equipe sao reconhecidos
create or replace function public.usuario_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and ativo = true
  );
$function$;
