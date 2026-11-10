# iBAD Autopeças — protótipo atualizado

Protótipo React + Vite para testar solicitações de peças, caixa de entrada dos vendedores e orçamento manual.

## Requisitos
- Node.js instalado (npm incluído)
- Visual Studio Code

## Executar
1. Abra esta pasta no VS Code.
2. Abra Terminal > Novo Terminal.
3. Execute `npm.cmd install` (no PowerShell do Windows).
4. Execute `npm.cmd run dev`.
5. Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

## Login demonstrativo
Entre em Painel do vendedor e informe qualquer usuário e senha não vazios. Isso **não é autenticação real**.

## O que há nesta versão
- Portal do mecânico sem cadastro, com inclusão de várias peças e geração de código.
- Caixa de entrada do vendedor com solicitações ordenadas por data, pesquisa, filtros e seleção de pedidos.
- Indicadores de solicitações novas, em orçamento e atendidas.
- Orçamento manual com preço, disponibilidade e filial de origem.
- Painel administrativo e as cinco unidades: Matriz, Nova Caxias, Ilha do Governador, Nova Iguaçu e Teresópolis.
- Persistência no `localStorage` e sincronização entre abas abertas no mesmo navegador.
- Tema escuro refinado e layout responsivo.

## Limitações importantes
Esta ainda é uma demonstração local. Os dados ficam no navegador e **não são compartilhados entre computadores ou celulares diferentes**. A sincronização automática funciona entre abas do mesmo navegador. O login é fictício, não há banco remoto nem integração com o estoque da empresa. Não use dados reais nem coloque esta versão em produção.

Para uso real, a próxima etapa é configurar Supabase (banco compartilhado, autenticação e permissões por perfil/filial), publicar com HTTPS e avaliar a API ou outro meio de integração do sistema de estoque existente.


## Excluir solicitações/orçamentos
No painel do vendedor, abra uma solicitação e use o botão vermelho **Excluir orçamento**. O sistema pede confirmação antes de excluir. A exclusão remove o registro do armazenamento local deste navegador; nesta demonstração não existe lixeira nem recuperação.


## Aceite ou recusa do orçamento
O mecânico pode consultar o código e, quando todos os itens tiverem preço e disponibilidade preenchidos e o vendedor enviar o orçamento, aceitar ou recusar. A recusa permite registrar um motivo. Alterações feitas pelo vendedor exigem novo envio para aprovação.

**Importante:** esta versão continua usando localStorage. As decisões só ficam disponíveis no mesmo navegador/origem. Para compartilhar entre computadores e celulares, publique o site e conecte um banco online (por exemplo Supabase); isso ainda não está configurado neste protótipo.
