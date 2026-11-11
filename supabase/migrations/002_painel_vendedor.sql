-- iBAD Autopecas | Etapa 3: painel do vendedor com autenticação e gravação de orçamentos
-- Execute depois da migration 001. Todos os acessos administrativos exigem Supabase Auth + perfil.

-- Permite excluir solicitação apenas a membros cadastrados da equipe (a FK remove os itens associados).
drop policy if exists "Equipe exclui solicitacoes" on public.solicitacoes;
create policy "Equipe exclui solicitacoes"
on public.solicitacoes
for delete to authenticated
using (public.usuario_equipe());

-- Salva todos os preços/disponibilidades de forma atômica, registra o orçamento
-- e muda o status para aguardar o mecânico quando todos os itens estiverem definidos.
create or replace function public.salvar_orcamento(p_codigo text, p_itens jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitacao_id uuid;
  v_vendedor text;
  v_item jsonb;
  v_item_id uuid;
  v_preco numeric(10,2);
  v_disponibilidade text;
  v_filial text;
  v_total numeric(10,2);
  v_prontos boolean;
  v_result jsonb;
  v_qtd_itens integer;
begin
  select p.nome into v_vendedor
  from public.perfis p
  where p.id = auth.uid()
    and p.perfil in ('vendedor', 'admin');

  if v_vendedor is null then
    raise exception 'Acesso não autorizado: perfil de vendedor ou administrador necessário.';
  end if;

  if p_codigo !~ '^AUTO-[0-9]{5}$' or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Dados do orçamento inválidos.';
  end if;

  select s.id into v_solicitacao_id
  from public.solicitacoes s
  where s.codigo = upper(trim(p_codigo))
  for update;

  if v_solicitacao_id is null then
    raise exception 'Solicitação não encontrada.';
  end if;

  select count(*) into v_qtd_itens
  from public.itens_solicitacao i
  where i.solicitacao_id = v_solicitacao_id;

  if jsonb_array_length(p_itens) <> v_qtd_itens then
    raise exception 'A lista de peças mudou. Atualize a solicitação antes de salvar.';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_item_id := (v_item->>'id')::uuid;
    v_disponibilidade := coalesce(v_item->>'disponibilidade', 'A consultar');
    v_filial := nullif(trim(v_item->>'filial'), '');
    v_preco := nullif(v_item->>'preco', '')::numeric;

    if v_disponibilidade not in ('A consultar', 'Disponível', 'Indisponível', 'Precisa transferir') then
      raise exception 'Disponibilidade inválida.';
    end if;

    if v_disponibilidade in ('Disponível', 'Precisa transferir') then
      if v_preco is null or v_preco <= 0 then
        raise exception 'Informe um preço maior que zero para cada peça disponível.';
      end if;
      if v_filial is null then
        raise exception 'Selecione a filial de origem de cada peça disponível.';
      end if;
    end if;

    update public.itens_solicitacao
    set preco = case when v_disponibilidade in ('Indisponível', 'A consultar') then null else v_preco end,
        disponibilidade = v_disponibilidade,
        filial = v_filial
    where id = v_item_id
      and solicitacao_id = v_solicitacao_id;

    if not found then
      raise exception 'Uma das peças não pertence a esta solicitação.';
    end if;
  end loop;

  select
    coalesce(sum(coalesce(i.preco, 0) * i.quantidade) filter (where i.disponibilidade <> 'Indisponível'), 0),
    bool_and(
      i.disponibilidade = 'Indisponível'
      or (i.disponibilidade in ('Disponível', 'Precisa transferir') and i.preco > 0 and i.filial is not null)
    )
  into v_total, v_prontos
  from public.itens_solicitacao i
  where i.solicitacao_id = v_solicitacao_id;

  update public.solicitacoes
  set status = case when coalesce(v_prontos, false)
                    then 'Aguardando resposta do mecânico'
                    else 'Em orçamento' end
  where id = v_solicitacao_id;

  insert into public.orcamentos (solicitacao_id, vendedor, valor_total, observacao)
  values (v_solicitacao_id, v_vendedor, v_total, 'Orçamento registrado pelo painel do vendedor.');

  select jsonb_build_object(
    'id', s.codigo,
    'createdAt', s.criado_em,
    'mechanic', s.nome_mecanico,
    'workshop', s.oficina,
    'phone', s.telefone,
    'vehicle', s.veiculo,
    'plate', s.placa,
    'notes', s.observacoes,
    'status', s.status,
    'decisionReason', d.motivo,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.nome_peca,
        'qty', i.quantidade,
        'price', i.preco,
        'availability', i.disponibilidade,
        'branch', coalesce(i.filial, '')
      ) order by i.criado_em)
      from public.itens_solicitacao i
      where i.solicitacao_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.solicitacoes s
  left join lateral (
    select motivo from public.decisoes
    where solicitacao_id = s.id order by criado_em desc limit 1
  ) d on true
  where s.id = v_solicitacao_id;

  return v_result;
end;
$$;

revoke all on function public.salvar_orcamento(text, jsonb) from public;
grant execute on function public.salvar_orcamento(text, jsonb) to authenticated;
