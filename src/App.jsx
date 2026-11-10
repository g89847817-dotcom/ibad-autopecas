import React, { useEffect, useMemo, useState } from 'react';
import { Wrench, Store, LayoutDashboard, ClipboardList, Search, Plus, Trash2, Copy, CheckCircle2, Clock3, Package, MapPin, LogIn, Menu, X, ArrowUpRight, CarFront, Boxes, RefreshCw } from 'lucide-react';

const BRANCHES = ['Matriz', 'Nova Caxias', 'Ilha do Governador', 'Nova Iguaçu', 'Teresópolis'];
const seed = [
  { id:'AUTO-58291', createdAt:new Date(Date.now()-3600000).toISOString(), mechanic:'João Silva', workshop:'Oficina do João', phone:'(21) 99999-0000', vehicle:'Honda Civic 2015', plate:'KPX-1A23', notes:'Preferência por peça original.', status:'Em orçamento', items:[{name:'Amortecedor dianteiro',qty:1,price:350,availability:'Disponível',branch:'Nova Caxias'},{name:'Pastilha de freio',qty:2,price:60,availability:'Disponível',branch:'Matriz'},{name:'Filtro de óleo',qty:1,price:35,availability:'Disponível',branch:'Teresópolis'}] },
  { id:'AUTO-41726', createdAt:new Date(Date.now()-86400000).toISOString(), mechanic:'Marcos', workshop:'Auto Center Central', phone:'', vehicle:'Chevrolet Onix 2020', plate:'', notes:'', status:'Aguardando atendimento', items:[{name:'Kit correia dentada',qty:1,price:0,availability:'A consultar',branch:''},{name:'Óleo 5W30',qty:4,price:0,availability:'A consultar',branch:''}] }
];
const money = n => Number(String(n||0).replace(',','.')).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date = s => new Date(s).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const makeCode = () => 'AUTO-' + Math.floor(10000 + Math.random()*90000);
const load = () => { try { const v=JSON.parse(localStorage.getItem('aph_requests')); return Array.isArray(v)?v:seed; } catch { return seed; } };

function App(){
  const [requests,setRequests] = useState(load);
  const [page,setPage] = useState('mechanic');
  const [query,setQuery] = useState('');
  const [selected,setSelected] = useState(null);
  const [notice,setNotice] = useState('');
  const [mobileMenu,setMobileMenu] = useState(false);
  const [form,setForm] = useState({mechanic:'',workshop:'',phone:'',vehicle:'',plate:'',notes:''});
  const [items,setItems] = useState([{name:'',qty:1}]);
  const [sellerName,setSellerName] = useState('Vendedor');
  const [logged,setLogged] = useState(false);
  const [login,setLogin] = useState({user:'',pass:''});
  useEffect(()=>localStorage.setItem('aph_requests',JSON.stringify(requests)),[requests]);
  // Sincroniza novas solicitações entre abas abertas no mesmo navegador.
  useEffect(()=>{const sync=e=>{if(e.key==='aph_requests'&&e.newValue){try{const data=JSON.parse(e.newValue);if(Array.isArray(data))setRequests(data)}catch{}}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
  useEffect(()=>{ if(notice){const t=setTimeout(()=>setNotice(''),3200);return()=>clearTimeout(t)}},[notice]);
  const stats = useMemo(()=>({total:requests.length,pending:requests.filter(r=>r.status==='Aguardando atendimento').length,quotes:requests.filter(r=>r.status==='Em orçamento').length,done:requests.filter(r=>r.status==='Atendido').length}),[requests]);
  const addItem=()=>setItems(v=>[...v,{name:'',qty:1}]);
  const updateItem=(i,k,v)=>setItems(old=>old.map((x,n)=>n===i?{...x,[k]:v}:x));
  const submitRequest=e=>{
    e.preventDefault();
    const valid=items.filter(x=>x.name.trim() && Number(x.qty)>0);
    if(!form.mechanic.trim()||!form.workshop.trim()||!form.vehicle.trim()||!valid.length){setNotice('Preencha nome, oficina, veículo e pelo menos uma peça.');return}
    let id=makeCode(); while(requests.some(r=>r.id===id)) id=makeCode();
    const r={...form,id,createdAt:new Date().toISOString(),status:'Aguardando atendimento',items:valid.map(x=>({name:x.name.trim(),qty:Number(x.qty),price:0,availability:'A consultar',branch:''}))};
    setRequests(old=>[r,...old]);setSelected(r);setQuery(id);setForm({mechanic:'',workshop:'',phone:'',vehicle:'',plate:'',notes:''});setItems([{name:'',qty:1}]);setNotice('Solicitação criada! Guarde seu código.'); 
  };
  const findRequest=()=>{const r=requests.find(x=>x.id.toLowerCase()===query.trim().toLowerCase());setSelected(r||null);if(!r)setNotice('Código não encontrado. Confira e tente novamente.');};
  const patchSelected=patch=>{
    setSelected(current=>{
      if(!current)return current;
      const updated={...current,...patch};
      setRequests(previous=>previous.map(r=>r.id===updated.id?updated:r));
      return updated;
    });
  };
  const decideQuote=(id,decision)=>{const target=requests.find(r=>r.id===id);if(!target)return;let reason='';if(decision==='Recusado pelo mecânico'){reason=window.prompt('Se quiser, informe o motivo da recusa:')||'';}const updated={...target,status:decision,decisionAt:new Date().toISOString(),decisionReason:reason};setRequests(old=>old.map(r=>r.id===id?updated:r));setSelected(updated);setNotice(decision==='Aprovado pelo mecânico'?'Orçamento aprovado!': 'Orçamento recusado.');};
  const deleteRequest=id=>{const target=requests.find(r=>r.id===id);if(!target)return;const ok=window.confirm(`Excluir a solicitação ${id} de ${target.workshop}? Esta ação não poderá ser desfeita.`);if(!ok)return;setRequests(old=>old.filter(r=>r.id!==id));setSelected(null);setQuery('');setNotice(`Solicitação ${id} excluída.`);};
  const patchItem=(i,patch)=>{
    setSelected(current=>{
      if(!current)return current;
      const updated={...current,status:'Em orçamento',items:current.items.map((it,n)=>n===i?{...it,...patch}:it)};
      setRequests(previous=>previous.map(r=>r.id===updated.id?updated:r));
      return updated;
    });
  };
  const total=selected?.items?.reduce((s,x)=>s+(x.availability==='Indisponível'?0:(Number(String(x.price||0).replace(',','.'))||0))*(Number(x.qty)||0),0)||0;
  const nav=[{id:'mechanic',label:'Portal do mecânico',icon:Wrench},{id:'seller',label:'Painel do vendedor',icon:Store},{id:'admin',label:'Visão geral',icon:LayoutDashboard}];
  const go=p=>{setPage(p);setMobileMenu(false);setSelected(null);setQuery('')};
  const copyCode=code=>{navigator.clipboard?.writeText(code);setNotice('Código copiado!')};
  const loginSubmit=e=>{e.preventDefault();if(!login.user.trim()||!login.pass.trim()){setNotice('Informe usuário e senha para demonstração.');return}setSellerName(login.user);setLogged(true);setNotice('Acesso de demonstração liberado.');};
  const logout=()=>{setLogged(false);setLogin({user:'',pass:''});go('mechanic')};

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'open':''}`}>
      <div className="brand"><div className="brand-logo-wrap"><img className="brand-logo" src="/ibad-logo.png" alt="iBAD Autopeças" /></div><div className="brand-copy"><b>iBAD <span>AUTOPEÇAS</span></b><small>Central de atendimento</small></div><button className="mobile-close" onClick={()=>setMobileMenu(false)}><X/></button></div>
      <div className="side-label">MENU PRINCIPAL</div>
      {nav.map(n=><button key={n.id} className={`nav-item ${page===n.id?'active':''}`} onClick={()=>go(n.id)}>{n.id==='mechanic'?<Wrench size={18}/>:n.id==='seller'?<Store size={18}/>:<LayoutDashboard size={18}/>}<span>{n.label}</span>{page===n.id&&<span className="nav-dot"/>}</button>)}
      <div className="sidebar-bottom"><div className="status-indicator"/><div><b>Ambiente de demonstração</b><small>Dados salvos neste navegador</small></div></div>
    </aside>
    {mobileMenu&&<div className="scrim" onClick={()=>setMobileMenu(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu-toggle" onClick={()=>setMobileMenu(true)}><Menu/></button><div className="crumb">iBAD Autopeças <span>/</span> {nav.find(n=>n.id===page)?.label}</div><div className="top-right"><span className="demo-pill"><i/> DEMO</span>{logged&&<button className="user-chip" onClick={logout}>{sellerName.slice(0,1).toUpperCase()} <span>{sellerName}</span></button>}</div></header>
      <div className="content">
        {page==='mechanic'&&<>
          <div className="page-heading"><div><div className="eyebrow">ÁREA EXTERNA</div><h1>Solicitar peças</h1><p>Cadastre as peças que sua oficina precisa e receba um código de acompanhamento.</p></div><div className="heading-icon"><Wrench size={25}/></div></div>
          <div className="notice info"><span className="notice-icon">i</span> Não precisa criar conta. Preencha os dados e guarde o código gerado ao finalizar.</div>
          <form className="panel form-panel" onSubmit={submitRequest}>
            <div className="section-title"><div className="section-number">01</div><div><h2>Dados da oficina e do veículo</h2><p>Informe quem está solicitando e para qual veículo.</p></div></div>
            <div className="form-grid">
              <label>Nome do mecânico *<input value={form.mechanic} onChange={e=>setForm({...form,mechanic:e.target.value})} placeholder="Ex.: João Silva" /></label>
              <label>Nome da oficina *<input value={form.workshop} onChange={e=>setForm({...form,workshop:e.target.value})} placeholder="Ex.: Oficina do João"/></label>
              <label>WhatsApp / telefone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(21) 99999-9999"/></label>
              <label>Veículo *<input value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})} placeholder="Ex.: Honda Civic 2015"/></label>
              <label>Placa (opcional)<input value={form.plate} onChange={e=>setForm({...form,plate:e.target.value.toUpperCase()})} placeholder="ABC-1D23" maxLength={8}/></label>
              <label className="span-2">Observações<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Motor, versão, lado da peça ou outras informações..." rows="2"/></label>
            </div>
            <div className="section-title items-title"><div className="section-number">02</div><div><h2>Peças necessárias</h2><p>Adicione todos os itens em uma única solicitação.</p></div></div>
            <div className="items-list">{items.map((it,i)=><div className="item-input-row" key={i}><div className="item-index">{String(i+1).padStart(2,'0')}</div><label className="grow">Descrição da peça *<input value={it.name} onChange={e=>updateItem(i,'name',e.target.value)} placeholder="Ex.: Amortecedor dianteiro"/></label><label className="qty-field">Qtd.<input type="number" min="1" max="999" value={it.qty} onChange={e=>updateItem(i,'qty',e.target.value)}/></label><button type="button" className="icon-button danger" title="Remover peça" disabled={items.length===1} onClick={()=>setItems(old=>old.filter((_,n)=>n!==i))}><Trash2 size={17}/></button></div>)}</div>
            <button type="button" className="add-item" onClick={addItem}><Plus size={16}/> Adicionar outra peça</button>
            <div className="form-footer"><span><b>*</b> Campos obrigatórios</span><button className="primary-btn" type="submit">Gerar solicitação <ArrowUpRight size={17}/></button></div>
          </form>
          {selected&&<div className="success-panel"><div className="success-icon"><CheckCircle2/></div><div className="success-copy"><b>Solicitação criada com sucesso!</b><span>Entregue este código ao vendedor para consultar as peças.</span></div><div className="code-copy"><strong>{selected.id}</strong><button onClick={()=>copyCode(selected.id)}><Copy size={15}/> Copiar</button></div></div>}
          <div className="lookup-strip"><div><b>Já tem um código?</b><span>Consulte o andamento da sua solicitação.</span></div><div className="lookup-controls"><input value={query} onChange={e=>setQuery(e.target.value.toUpperCase())} placeholder="AUTO-12345"/><button className="secondary-btn" onClick={findRequest}>Consultar</button></div></div>
          {selected&&<RequestSummary request={selected} onDecision={decideQuote}/>}
        </>}
        {page==='seller'&&<>{!logged?<div className="login-wrap"><div className="login-card"><div className="login-icon"><Store/></div><div className="eyebrow">ACESSO INTERNO</div><h1>Painel do vendedor</h1><p>Entre para consultar solicitações e preparar orçamentos.</p><form onSubmit={loginSubmit}><label>Usuário<input value={login.user} onChange={e=>setLogin({...login,user:e.target.value})} placeholder="Seu usuário"/></label><label>Senha<input type="password" value={login.pass} onChange={e=>setLogin({...login,pass:e.target.value})} placeholder="Sua senha"/></label><button className="primary-btn full" type="submit"><LogIn size={17}/> Entrar na demonstração</button><small>Protótipo: qualquer usuário e senha não vazios permitem entrar.</small></form></div></div>:<SellerPanel requests={requests} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} findRequest={findRequest} patchSelected={patchSelected} patchItem={patchItem} total={total} sellerName={sellerName} setNotice={setNotice} onDelete={deleteRequest}/>}</>}
        {page==='admin'&&<><div className="page-heading"><div><div className="eyebrow">GESTÃO DA REDE</div><h1>Visão geral</h1><p>Acompanhe as solicitações registradas neste navegador.</p></div><div className="heading-icon"><LayoutDashboard size={25}/></div></div><div className="stats-grid"><Stat icon={<ClipboardList/>} label="Solicitações" value={stats.total} tone="blue"/><Stat icon={<Clock3/>} label="Aguardando" value={stats.pending} tone="orange"/><Stat icon={<Package/>} label="Em orçamento" value={stats.quotes} tone="purple"/><Stat icon={<CheckCircle2/>} label="Atendidas" value={stats.done} tone="green"/></div><div className="panel"><div className="panel-heading"><div><h2>Solicitações recentes</h2><p>Todos os pedidos criados na demonstração.</p></div><button className="secondary-btn small" onClick={()=>setRequests(seed)}><RefreshCw size={14}/> Restaurar exemplos</button></div><RequestTable requests={requests} onSelect={r=>{setSelected(r);setQuery(r.id);setPage('seller');setLogged(true)}}/></div><div className="branches-panel"><div className="panel-heading"><div><h2>Unidades da rede</h2><p>Filiais cadastradas no projeto.</p></div><span className="count-pill">05 unidades</span></div><div className="branches-grid">{BRANCHES.map((b,i)=><div className="branch-card" key={b}><div className="branch-icon"><Store size={18}/></div><div><b>{b}</b><small>{i===0?'Unidade principal':'Filial'}</small></div><span className="live-dot"/></div>)}</div></div></>}
      </div>
      <footer className="footer"><span>© 2026 iBAD Autopeças</span><span>Protótipo funcional · Não conectado ao estoque da empresa</span></footer>
    </main>
    {notice&&<div className="toast"><CheckCircle2 size={17}/>{notice}</div>}
  </div>
}

function Stat({icon,label,value,tone}){return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>}
function RequestSummary({request:r,onDecision}){
 const ready=r.items.length>0&&r.items.every(x=>x.availability==='Indisponível'||(Number(String(x.price||0).replace(',','.'))>0&&x.availability!=='A consultar'));
 const awaiting=r.status==='Aguardando resposta do mecânico';
 return <div className="panel summary-panel"><div className="panel-heading"><div><h2>Resumo da solicitação {r.id}</h2><p>{r.vehicle} · {r.workshop}</p></div><Status status={r.status}/></div><div className="summary-items">{r.items.map((x,i)=>{
 const unavailable=x.availability==='Indisponível';
 const price=Number(String(x.price||0).replace(',','.'));
 return <div key={i}><span>{x.name} <small>× {x.qty} · {unavailable?'Sem estoque':(x.branch||'Filial não informada')}</small></span><b className={unavailable?'unavailable-price':''}>{unavailable?'SEM ESTOQUE':price>0?money(price*x.qty):'Aguardando preço'}</b></div>;
 })}</div>{ready&&awaiting&&<div className="mechanic-decision"><b>Seu orçamento está pronto!</b><p>Confira os valores e informe se deseja aceitar ou recusar esta proposta.</p><div className="decision-buttons"><button className="accept-quote" onClick={()=>onDecision(r.id,'Aprovado pelo mecânico')}><CheckCircle2 size={16}/> Aceitar orçamento</button><button className="decline-quote" onClick={()=>onDecision(r.id,'Recusado pelo mecânico')}><X size={16}/> Recusar orçamento</button></div></div>}{r.decisionReason&&<p className="decision-note">Motivo informado: {r.decisionReason}</p>}</div>}
function Status({status}){let c=['Atendido','Aprovado pelo mecânico'].includes(status)?'green':['Em orçamento','Aguardando resposta do mecânico'].includes(status)?'purple':['Cancelado','Recusado pelo mecânico'].includes(status)?'red':'orange';return <span className={`status ${c}`}>{status}</span>}
function RequestTable({requests,onSelect}){if(!requests.length)return <div className="empty">Nenhuma solicitação cadastrada.</div>;return <div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>OFICINA / VEÍCULO</th><th>DATA</th><th>STATUS</th><th></th></tr></thead><tbody>{requests.map(r=><tr key={r.id}><td><b className="mono">{r.id}</b></td><td><b>{r.workshop}</b><small>{r.vehicle}</small></td><td>{date(r.createdAt)}</td><td><Status status={r.status}/></td><td><button className="text-btn" onClick={()=>onSelect(r)}>Abrir <ArrowUpRight size={14}/></button></td></tr>)}</tbody></table></div>}
function SellerPanel({requests,query,setQuery,selected,setSelected,findRequest,patchSelected,patchItem,total,sellerName,setNotice,onDelete}){
 const [filter,setFilter]=useState('Todas');
 const [listSearch,setListSearch]=useState('');
 const ordered=[...requests].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 const filtered=ordered.filter(r=>{
   const matchesFilter=filter==='Todas'||(filter==='Novas'?r.status==='Aguardando atendimento':filter==='Em orçamento'?r.status==='Em orçamento':r.status==='Atendido');
   const term=listSearch.trim().toLowerCase();
   const matchesText=!term||[r.id,r.workshop,r.mechanic,r.vehicle].some(v=>(v||'').toLowerCase().includes(term));
   return matchesFilter&&matchesText;
 });
 const open=r=>{setSelected(r);setQuery(r.id)};
 const newCount=requests.filter(r=>r.status==='Aguardando atendimento').length;
 return <>
  <div className="page-heading"><div><div className="eyebrow">CENTRAL DE OPERAÇÕES</div><h1>Central do vendedor</h1><p>Olá, {sellerName}. Acompanhe as solicitações recebidas e prepare os orçamentos.</p></div><div className="heading-icon"><Store size={25}/></div></div>
  <div className="seller-overview"><div className="seller-welcome"><div><span className="eyebrow">PAINEL DE ATENDIMENTO</span><h2>Solicitações da rede</h2><p>Os pedidos cadastrados aparecem nesta lista automaticamente nesta demonstração.</p></div><div className="live-indicator"><i/> Atualização ativa</div></div><div className="seller-metrics"><div><span>Solicitações</span><b>{requests.length}</b></div><div><span>Novas</span><b className="metric-orange">{newCount}</b></div><div><span>Em orçamento</span><b>{requests.filter(r=>r.status==='Em orçamento').length}</b></div><div><span>Atendidas</span><b className="metric-green">{requests.filter(r=>r.status==='Atendido').length}</b></div></div></div>
  <div className="seller-workspace">
   <section className="panel inbox-panel">
    <div className="inbox-heading"><div><div className="inbox-title"><h2>Caixa de solicitações</h2>{newCount>0&&<span className="new-count">{newCount} nova{newCount>1?'s':''}</span>}</div><p>Selecione um pedido para consultar os itens e montar o orçamento.</p></div><span className="inbox-total">{filtered.length} registro(s)</span></div>
    <div className="inbox-search"><Search size={17}/><input value={listSearch} onChange={e=>setListSearch(e.target.value)} placeholder="Buscar código, oficina ou veículo..."/><button title="Limpar busca" onClick={()=>setListSearch('')}><X size={15}/></button></div>
    <div className="inbox-filters">{['Todas','Novas','Em orçamento','Atendido'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}{f==='Novas'&&newCount>0&&<b>{newCount}</b>}</button>)}</div>
    <div className="request-inbox-list">{filtered.length?filtered.map(r=><button key={r.id} className={`request-inbox-item ${selected?.id===r.id?'chosen':''}`} onClick={()=>open(r)}><div className="request-item-top"><b className="mono">{r.id}</b><Status status={r.status}/></div><strong>{r.workshop}</strong><span>{r.vehicle} · {r.mechanic}</span><div className="request-item-bottom"><small><Clock3 size={12}/>{date(r.createdAt)}</small><small><Package size={12}/>{r.items.length} peça(s)</small></div></button>):<div className="inbox-empty"><Package size={25}/><b>Nenhuma solicitação encontrada</b><span>Altere o filtro ou a pesquisa para ver outros pedidos.</span></div>}</div>
    <div className="inbox-foot"><i/> Atualiza entre abas abertas neste navegador. Para receber pedidos de outros dispositivos, será necessário conectar um banco de dados online.</div>
   </section>
   <section className="seller-detail-column">
    <div className="panel search-panel compact-search"><div className="search-title"><div className="search-icon"><Search/></div><div><b>Buscar pelo código</b><span>Use o código informado pelo mecânico.</span></div></div><div className="search-controls"><input value={query} onChange={e=>setQuery(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&findRequest()} placeholder="AUTO-58291"/><button className="primary-btn" onClick={findRequest}><Search size={16}/></button></div></div>
    {selected?<div className="panel quote-panel"><div className="panel-heading"><div><div className="eyebrow">SOLICITAÇÃO {selected.id}</div><h2>{selected.workshop}</h2><p>{selected.mechanic} · {selected.vehicle} {selected.plate&&'· '+selected.plate}</p></div><Status status={selected.status}/></div>{selected.phone&&<div className="meta-line">Telefone: {selected.phone}</div>}{selected.notes&&<div className="notes-box">Observações: {selected.notes}</div>}<div className="quote-table"><div className="quote-head"><span>PEÇA / QUANTIDADE</span><span>PREÇO UNITÁRIO</span><span>DISPONIBILIDADE</span></div>{selected.items.map((it,i)=><div className="quote-row" key={i}><div><b>{it.name}</b><small>Quantidade: {it.qty}</small></div><label className="price-input"><span>R$</span><input type="text" inputMode="decimal" value={it.price ?? ''} placeholder="0,00" onChange={e=>{const v=e.target.value;if(/^\d*([.,]\d{0,2})?$/.test(v))patchItem(i,{price:v});}}/></label><div className="availability-fields"><select value={it.availability||'A consultar'} onChange={e=>patchItem(i,{availability:e.target.value})}><option>A consultar</option><option>Disponível</option><option>Indisponível</option><option>Precisa transferir</option></select><select value={it.branch||''} onChange={e=>patchItem(i,{branch:e.target.value})}><option value="">Filial / origem</option>{BRANCHES.map(b=><option key={b}>{b}</option>)}</select></div></div>)}</div><div className="quote-total"><span>Valor total do orçamento</span><strong>{money(total)}</strong></div><div className="quote-actions"><button className="delete-request-btn" onClick={()=>onDelete(selected.id)}><Trash2 size={16}/> Excluir orçamento</button><select value={selected.status} onChange={e=>patchSelected({status:e.target.value})}><option>Aguardando atendimento</option><option>Em orçamento</option><option>Aguardando resposta do mecânico</option><option>Aprovado pelo mecânico</option><option>Recusado pelo mecânico</option><option>Aguardando confirmação</option><option>Atendido</option><option>Cancelado</option></select><button className="primary-btn" onClick={()=>{patchSelected({status:'Aguardando resposta do mecânico'});setNotice('Orçamento enviado ao mecânico nesta demonstração.')}}><CheckCircle2 size={17}/> Salvar orçamento</button></div>{['Aprovado pelo mecânico','Recusado pelo mecânico'].includes(selected.status)&&<div className="approved-contact">
<b>{selected.status==='Aprovado pelo mecânico'?'Orçamento aprovado pelo mecânico':'Orçamento recusado pelo mecânico'}</b>
<p>{selected.status==='Aprovado pelo mecânico'?'Entre em contato para combinar retirada, entrega e pagamento.':'Se desejar, entre em contato para entender o motivo da recusa, esclarecer dúvidas ou oferecer alternativas. A recusa permanece registrada.'}</p>
{selected.decisionReason&&selected.status==='Recusado pelo mecânico'&&<p>Motivo informado: {selected.decisionReason}</p>}
{selected.phone?<a className="primary-btn" href={`https://wa.me/55${String(selected.phone).replace(/\D/g,'').replace(/^55/,'')}?text=${encodeURIComponent(selected.status==='Aprovado pelo mecânico'?`Olá, ${selected.mechanic}! Recebemos a aprovação do orçamento ${selected.id} da ${selected.workshop}. Vamos combinar os próximos passos?`:`Olá, ${selected.mechanic}! Tudo bem? Vimos que você recusou o orçamento ${selected.id} da iBAD Autopeças. Gostaríamos de saber se podemos ajudar com alguma dúvida, valor ou alternativa de peça. Ficamos à disposição!`)}`} target="_blank" rel="noreferrer">{selected.status==='Aprovado pelo mecânico'?'Conversar pelo WhatsApp':'Conversar sobre a recusa pelo WhatsApp'}</a>:<small>Esta solicitação não possui telefone cadastrado. Entre em contato pelos dados da oficina.</small>}
</div>}<div className="prototype-warning">Preços e disponibilidade são informados manualmente. A consulta automática depende da integração com o estoque da empresa.</div></div>:<div className="panel empty-state detail-empty"><div className="empty-icon"><ClipboardList/></div><h3>Selecione uma solicitação</h3><p>Escolha um pedido na caixa ao lado ou pesquise pelo código para visualizar as peças.</p></div>}
    <div className="panel branches-mini"><div className="panel-heading"><div><h2>Unidades da rede</h2><p>Filiais disponíveis para consulta.</p></div><Boxes size={18}/></div>{BRANCHES.map((b,i)=><div className="branch-line" key={b}><MapPin size={14}/><span>{b}</span><small>{i===0?'Matriz':'Filial'}</small></div>)}</div>
   </section>
  </div>
 </>
}
export default App;
