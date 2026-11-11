
import { supabase } from './supabase'

function mapSolicitacao(row) {
  return {
    id: row.codigo,
    dbId: row.id,
    createdAt: row.criado_em,
    mechanic: row.nome_mecanico,
    workshop: row.oficina || '',
    phone: row.telefone || '',
    vehicle: row.veiculo || '',
    plate: row.placa || '',
    notes: row.observacoes || '',
    status: row.status,
    decisionReason: row.decisoes?.[0]?.motivo || '',
    items: (row.itens_solicitacao || []).map(item => ({
      id: item.id,
      name: item.nome_peca,
      qty: item.quantidade,
      price: item.preco == null ? '' : String(item.preco),
      availability: item.disponibilidade || 'A consultar',
      branch: item.filial || ''
    }))
  }
}

export async function criarSolicitacao(dados) {
  const { data, error } = await supabase.rpc('criar_solicitacao', {
    p_dados: {
      mechanic: dados.mechanic,
      workshop: dados.workshop,
      phone: dados.phone || '',
      vehicle: dados.vehicle,
      plate: dados.plate || '',
      notes: dados.notes || '',
      items: dados.items.map(item => ({
        name: item.name,
        qty: Number(item.qty)
      }))
    }
  })

  if (error) throw error
  return data
}

export async function consultarSolicitacao(codigo) {
  const { data, error } = await supabase.rpc('consultar_solicitacao', {
    p_codigo: String(codigo || '').trim().toUpperCase()
  })

  if (error) throw error
  return data
}

export async function responderOrcamento(codigo, decisao, motivo = '') {
  const { data, error } = await supabase.rpc('responder_orcamento', {
    p_codigo: String(codigo || '').trim().toUpperCase(),
    p_decisao: decisao,
    p_motivo: motivo
  })

  if (error) throw error
  return data
}

export async function entrarEquipe(usuario, senha) {
  const identificador = String(usuario || '').trim().toLowerCase()

  const email = identificador.includes('@')
    ? identificador
    : `${identificador}@ibad.local`

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  })

  if (error) throw error

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('id, nome, perfil, filial, ativo')
    .eq('id', data.user.id)
    .single()

  if (perfilError || !perfil) {
    await supabase.auth.signOut()
    throw new Error('Perfil não encontrado. Procure o administrador.')
  }

  if (perfil.ativo === false) {
    await supabase.auth.signOut()
    throw new Error('Este usuário está desativado. Procure o administrador.')
  }

  if (!['vendedor', 'admin'].includes(perfil.perfil)) {
    await supabase.auth.signOut()
    throw new Error('Este usuário não possui permissão para acessar o painel.')
  }

  return { user: data.user, perfil }
}

export async function restaurarSessaoEquipe() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (!sessionData.session?.user) return null

  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('id, nome, perfil, filial, ativo')
    .eq('id', sessionData.session.user.id)
    .single()

  if (error || !perfil || perfil.ativo === false) {
    await supabase.auth.signOut()
    return null
  }

  return { user: sessionData.session.user, perfil }
}

export async function sairEquipe() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function listarSolicitacoesEquipe() {
  const { data, error } = await supabase.rpc(
    'listar_solicitacoes_equipe'
  )

  if (error) throw error

  return (data || []).map(mapSolicitacao)
}

export async function salvarOrcamentoEquipe(codigo, itens) {
  const payload = itens.map(item => ({
    id: item.id,
    preco:
      item.availability === 'Indisponível' || item.price === ''
        ? null
        : Number(String(item.price).replace(',', '.')),
    disponibilidade: item.availability || 'A consultar',
    filial: item.branch || null
  }))

  const { data, error } = await supabase.rpc('salvar_orcamento', {
    p_codigo: String(codigo || '').trim().toUpperCase(),
    p_itens: payload
  })

  if (error) throw error
  return data
}

export async function excluirSolicitacaoEquipe(codigo) {
  const { error } = await supabase
    .from('solicitacoes')
    .delete()
    .eq('codigo', String(codigo || '').trim().toUpperCase())

  if (error) throw error
}

async function chamarGerenciarVendedores(dados) {
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session?.access_token) {
    throw new Error('Faça login novamente.')
  }

  const { data, error } = await supabase.functions.invoke(
    'gerenciar-vendedores',
    { body: dados }
  )

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}

export async function listarVendedores() {
  return chamarGerenciarVendedores({ action: 'list' })
}

export async function cadastrarVendedor(dados) {
  return chamarGerenciarVendedores({ action: 'create', ...dados })
}

export async function editarVendedor(dados) {
  return chamarGerenciarVendedores({ action: 'update', ...dados })
}

export async function alterarStatusVendedor(id, ativo) {
  return chamarGerenciarVendedores({
    action: 'set_active',
    id,
    ativo
  })
}

export async function redefinirSenhaVendedor(id, senha) {
  return chamarGerenciarVendedores({
    action: 'reset_password',
    id,
    senha
  })
}
