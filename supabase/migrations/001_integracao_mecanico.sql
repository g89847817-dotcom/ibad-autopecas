
-- iBAD Autopeças | Migração de integração Supabase
-- Execute no SQL Editor do projeto. Não habilita acesso direto público às tabelas.

-- 1) Campos usados pelo formulário atual
alter table public.solicitacoes
  add column if not exists oficina text,
  add column if not exists veiculo text,
  add column if not exists placa text,
  add column if not exists observacoes text;

-- 2) RPC para o mecânico abrir uma solicitação sem criar conta.
-- O navegador só pode chamar esta função; não recebe permissão para ler a tabela inteira.
create or replace function public.criar_solicitacao(p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_codigo text;
  v_item jsonb;
  v_result jsonb;
begin
  if coalesce(length(trim(p_dados->>'mechanic')), 0) < 2
     or coalesce(length(trim(p_dados->>'workshop')), 0) < 2
     or coalesce(length(trim(p_dados->>'vehicle')), 0) < 2
     or jsonb_typeof(p_dados->'items') <> 'array'
     or jsonb_array_length(p_dados->'items') < 1
     or jsonb_array_length(p_dados->'items') > 30 then
    raise exception 'Dados da solicitação inválidos.';
  end if;

  loop
    v_codigo := 'AUTO-' || lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
    exit when not exists (select 1 from public.solicitacoes s where s.codigo = v_codigo);
  end loop;

  insert into public.solicitacoes
    (codigo, nome_mecanico, telefone, oficina, veiculo, placa, observacoes, status)
  values
    (v_codigo, trim(p_dados->>'mechanic'), nullif(trim(p_dados->>'phone'), ''),
     trim(p_dados->>'workshop'), trim(p_dados->>'vehicle'),
     nullif(trim(p_dados->>'plate'), ''), nullif(trim(p_dados->>'notes'), ''),
     'Aguardando atendimento')
  returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_dados->'items')
  loop
    if coalesce(length(trim(v_item->>'name')), 0) < 1
       or coalesce((v_item->>'qty')::int, 0) < 1
       or (v_item->>'qty')::int > 999 then
      raise exception 'Item inválido.';
    end if;

    insert into public.itens_solicitacao
      (solicitacao_id, nome_peca, quantidade, preco, disponibilidade, filial)
    values
      (v_id, trim(v_item->>'name'), (v_item->>'qty')::int, null, 'A consultar', null);
  end loop;

  select jsonb_build_object(
    'id', s.codigo, 'createdAt', s.criado_em, 'mechanic', s.nome_mecanico,
    'workshop', s.oficina, 'phone', s.telefone, 'vehicle', s.veiculo,
    'plate', s.placa, 'notes', s.observacoes, 'status', s.status,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.nome_peca, 'qty', i.quantidade, 'price', coalesce(i.preco, 0),
        'availability', i.disponibilidade, 'branch', coalesce(i.filial, '')
      ) order by i.criado_em)
      from public.itens_solicitacao i where i.solicitacao_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.solicitacoes s where s.id = v_id;

  return v_result;
end;
$$;

-- 3) Consulta pública limitada a um código exato, sem expor a lista de solicitações.
create or replace function public.consultar_solicitacao(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if p_codigo !~ '^AUTO-[0-9]{5}$' then
    return null;
  end if;

  select jsonb_build_object(
    'id', s.codigo, 'createdAt', s.criado_em, 'mechanic', s.nome_mecanico,
    'workshop', s.oficina, 'phone', s.telefone, 'vehicle', s.veiculo,
    'plate', s.placa, 'notes', s.observacoes, 'status', s.status,
    'decisionReason', d.motivo,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.nome_peca, 'qty', i.quantidade, 'price', coalesce(i.preco, 0),
        'availability', i.disponibilidade, 'branch', coalesce(i.filial, '')
      ) order by i.criado_em)
      from public.itens_solicitacao i where i.solicitacao_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.solicitacoes s
  left join lateral (
    select motivo from public.decisoes
    where solicitacao_id = s.id order by criado_em desc limit 1
  ) d on true
  where s.codigo = upper(trim(p_codigo));

  return v_result;
end;
$$;

-- 4) Registrar aprovação/recusa pelo código. Motivo é opcional.
create or replace function public.responder_orcamento(
  p_codigo text, p_decisao text, p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_status text;
begin
  if p_decisao not in ('Aprovado pelo mecânico', 'Recusado pelo mecânico') then
    raise exception 'Decisão inválida.';
  end if;

  select id into v_id from public.solicitacoes
  where codigo = upper(trim(p_codigo))
    and status = 'Aguardando resposta do mecânico';

  if v_id is null then
    raise exception 'Solicitação não encontrada ou orçamento não está aguardando resposta.';
  end if;

  v_status := p_decisao;
  update public.solicitacoes set status = v_status where id = v_id;

  insert into public.decisoes (solicitacao_id, decisao, motivo)
  values (
    v_id,
    case when p_decisao = 'Aprovado pelo mecânico' then 'Aprovado' else 'Recusado' end,
    left(nullif(trim(p_motivo), ''), 1000)
  );

  return public.consultar_solicitacao(p_codigo);
end;
$$;

-- 5) Restringe execução das funções públicas aos papéis necessários.
revoke all on function public.criar_solicitacao(jsonb) from public;
revoke all on function public.consultar_solicitacao(text) from public;
revoke all on function public.responder_orcamento(text, text, text) from public;

grant execute on function public.criar_solicitacao(jsonb) to anon, authenticated;
grant execute on function public.consultar_solicitacao(text) to anon, authenticated;
grant execute on function public.responder_orcamento(text, text, text) to anon, authenticated;
