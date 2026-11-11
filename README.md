iBAD AUTOPECAS — ETAPA 3: PAINEL DO VENDEDOR + AUTENTICACAO

O QUE ESTA VERSAO FAZ
- Mantem o formulario publico do mecanico conectado ao Supabase.
- Consulta pedidos por codigo pelo portal do mecanico.
- Usa Supabase Auth para o login da equipe (nao aceita mais qualquer usuario/senha).
- Carrega a lista de solicitacoes diretamente do banco para vendedor/admin.
- Salva preco, disponibilidade e filial de cada item no Supabase.
- Registra o orcamento e muda o status para "Aguardando resposta do mecanico" quando todos os itens estiverem completos.
- Salva aprovacao/recusa usando a funcao RPC ja criada.
- Exclui solicitacoes pelo banco, somente para usuarios autenticados da equipe.

ANTES DE USAR
1. Faca backup da pasta anterior. NAO apague a pasta anterior.
2. Extraia esta versao para uma nova pasta.
3. Copie o arquivo .env da versao que ja funciona para a raiz desta nova pasta, ao lado de package.json.
   Nao compartilhe o .env e nao o envie ao GitHub.
4. No Supabase > SQL Editor, execute o arquivo:
   supabase/migrations/002_painel_vendedor.sql
   Ele deve ser executado depois da migration 001 ja aplicada.
5. No terminal do VS Code, execute npm.cmd install e depois npm.cmd run build.
6. Se o build terminar sem erros, execute npm.cmd run dev e abra o localhost informado.

CRIAR O PRIMEIRO USUARIO INTERNO (ADMIN DE TESTE)
1. No Supabase, entre em Authentication > Users > Add user.
2. Crie um usuario com e-mail e senha de teste. Nao use credenciais pessoais reutilizadas.
3. Copie o UUID/ID desse usuario na lista de Users.
4. No SQL Editor, execute este comando substituindo os valores:

insert into public.perfis (id, nome, perfil, filial)
values ('COLE-AQUI-O-UUID-DO-USUARIO', 'Administrador de teste', 'admin', 'Matriz');

5. Saia do portal e entre no Painel do vendedor ou Visao administrativa com o e-mail e senha criados.

CRIAR VENDEDORES
Repita Authentication > Users > Add user para cada vendedor e insira um perfil correspondente:

insert into public.perfis (id, nome, perfil, filial)
values ('UUID-DO-VENDEDOR', 'Nome do vendedor', 'vendedor', 'Matriz');

Use para filial uma destas opcoes: Matriz, Nova Caxias, Ilha do Governador, Nova Iguacu, Teresopolis.

TESTE
- Crie uma solicitacao ficticia pelo portal do mecanico.
- Entre como admin/vendedor com a conta criada.
- Atualize a lista, abra a solicitacao, informe preco, disponibilidade e filial para cada item.
- Clique em Salvar orcamento.
- Consulte o mesmo codigo em janela anonima/outro navegador; o status e o orcamento devem aparecer.
- Teste a aprovacao/recusa e confirme na tabela decisoes.

LIMITACOES / SEGURANCA
- O fluxo atual de acompanhamento usa codigo curto AUTO-12345. Isso serve apenas para teste controlado; antes de producao deve ser substituido por token imprevisivel mais longo, com limitacao de tentativas e monitoramento.
- A decisao publica por codigo tambem depende desse codigo curto. Nao use dados reais ou divulgue codigos antes do reforco.
- Ainda e necessario testar esta migracao no projeto Supabase real e revisar as politicas RLS. Nao considerar pronto para producao.
- GitHub Pages publica somente o frontend. Nunca colocar service_role/secret key no frontend; apenas a publishable key no .env local (e, para deploy, configurada de forma consciente como variavel do build).
