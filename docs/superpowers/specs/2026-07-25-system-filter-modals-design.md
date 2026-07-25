# Padronização sistêmica das modais de filtro

**Data:** 2026-07-25  
**Status:** aprovado para planejamento  
**Referência visual:** modal de filtros do Kanban (`FilterModalThreeCol`)

## Objetivo

Padronizar todas as superfícies de filtro do CRM com o mesmo vocabulário visual e de interação do modal canônico do Kanban, sem alterar os campos, contratos de API, regras de filtragem ou persistência próprios de cada página.

A busca textual permanece inline. Os demais filtros, inclusive status, períodos, KPIs segmentadores e atalhos hoje expostos diretamente na página, passam a ser organizados em modais. Navegação estrutural — como pastas de e-mail, calendário e troca de área — não é filtro e permanece na tela.

## Decisões aprovadas

1. Um shell compartilhado será a fonte visual única.
2. Haverá variantes `wide` e `compact`, escolhidas pela densidade de cada página.
3. Filtros complexos usam rascunho, **Aplicar**, **Limpar** e cancelamento.
4. Filtros simples de uma única escolha continuam com aplicação imediata dentro da modal compacta.
5. A busca textual não abre a modal ao receber foco; o botão de ajustes é o gatilho.
6. Campos, informações, contadores, permissões, APIs, query keys, URL e localStorage existentes serão preservados.
7. Cada onda será publicada primeiro na `DEV_BRANCH`; merge na `main` ocorrerá somente após validação visual.

## Arquitetura compartilhada

### `FilterModalShell`

Dialog central responsável por:

- backdrop com blur;
- cabeçalho com ícone, título, descrição opcional e contador de filtros;
- área de conteúdo responsiva;
- ações **Limpar**, **Cancelar** e **Aplicar** quando aplicáveis;
- variantes `wide` e `compact`;
- portal consistente e integração com `ModalPortalContext`;
- bloqueio de scroll, foco preso, fechamento por `Esc` e retorno do foco ao gatilho.

O shell não conhece tipos de filtro nem executa consultas. Cada consumidor fornece conteúdo, contagem e callbacks.

### `FilterSearchTrigger`

Componente para a busca inline e botão de ajustes:

- mantém debounce e estado de busca de cada tela;
- não abre modal no foco do campo;
- exibe contador de filtros no botão;
- preserva atalhos e acessibilidade;
- permite ocultar a busca em páginas sem pesquisa textual.

### `FilterSegmentTabs`

Navegação interna opcional para modais densas:

- exibe uma categoria por vez;
- suporta contador por categoria;
- mantém o conteúdo principal organizado sem depender de breakpoints do viewport;
- não é usada em modais compactas de um ou poucos grupos.

### Primitivos reutilizados

Os componentes atuais de `kanban-filters/v2/core.tsx` serão reaproveitados ou movidos para uma localização neutra quando deixarem de ser específicos do funil:

- `FieldCard`;
- `MultiSelectDropdown`;
- `useFilterDraft`;
- grupos de pills;
- presets e campos de período;
- indicadores e ações de limpeza.

Essa extração será incremental para evitar uma refatoração ampla antes do primeiro consumidor.

## Variantes

### Wide

Usada quando há múltiplas categorias, ordenação, filtros salvos ou uma coleção extensa de tags:

- Kanban e lista do funil;
- Inbox;
- Contatos.

Estrutura preferencial:

1. coluna esquerda: ordenação, atalhos, filtros salvos e segmentações;
2. coluna central: categorias e campos;
3. coluna direita: tags ou outra coleção extensa, quando existir.

Colunas sem conteúdo são removidas; não haverá espaço vazio meramente para manter três colunas.

### Compact

Usada nas demais páginas com poucos grupos:

- Empresas;
- Logs de atividade e chamadas;
- Dashboard;
- Distribuição;
- Automações;
- Campanhas e segmentos;
- configurações administrativas;
- Vagas;
- Atividades;
- Relatórios e Analytics;
- filtros de listagens de E-mail;
- detalhes e logs com segmentação.

O conteúdo usa cards empilhados ou uma grade adaptativa pelo tamanho real do container. Modais com escolha única aplicam imediatamente e dispensam footer de aplicação.

## Comportamento de estado

### Filtros complexos

Ao abrir, a modal cria um draft a partir do estado aplicado. Alterações não disparam consultas até **Aplicar**. **Cancelar**, `Esc` ou clique no backdrop descartam o draft. **Limpar** limpa o draft; a consulta só muda após aplicação.

Aplicável a Kanban/lista, Inbox, Contatos, Empresas, Chamadas e filtros avançados do Dashboard.

### Filtros simples

Uma seleção é aplicada imediatamente e a modal pode permanecer aberta para permitir outra escolha. O estado selecionado e a ação de limpar ficam sempre visíveis.

Aplicável a status de Automações, Campanhas e Vagas; segmentações de Distribuição; grupos simples de Settings; tabs de logs; períodos simples e KPIs segmentadores convertidos em atalhos da modal.

### Persistência

Não será criado um store global de filtros. Cada módulo mantém seu mecanismo atual:

- Kanban e lista: URL/localStorage e `useKanbanFilters`;
- Dashboard: query string e `useDashboardFilters`;
- Inbox: `InboxFilters`, localStorage e divisão server/client;
- demais páginas: estado local, hooks e query keys existentes.

## Escopo funcional por onda

### Onda 1 — infraestrutura

- extrair `FilterModalShell`;
- criar `FilterSearchTrigger` e `FilterSegmentTabs`;
- fazer o Kanban consumir o shell sem mudança funcional;
- validar desktop, mobile, tema escuro e acessibilidade básica.

### Onda 2 — diretório

- Contatos em modal wide;
- Empresas em modal compacta;
- manter parâmetros de `useContacts`, `useCompanies`, facets, stats e paginação;
- mover segmentos/KPIs de listagem para a seção **Atalhos** da modal;
- manter busca textual inline.

### Onda 3 — Inbox

- substituir o portal/popover atual pelo shell wide;
- preservar ordenação client-side, filtros server-side, permissões por canal, tags, pipelines, fontes e persistência;
- manter ações em massa coerentes com `serverFilters`.

### Onda 4 — Logs

- feed de eventos em modal compacta;
- chamadas em modal compacta com draft;
- preservar `ActivityFeedFilters`, `CallsFilterState`, contagens, paginação e períodos.

### Onda 5 — operação

- Dashboard;
- Distribuição;
- Automações;
- Campanhas, detalhe e audiência;
- mover controles estruturais de filtro para **Atalhos** dentro da modal;
- manter navegação e busca textual inline.

### Onda 6 — administração

- migrar `SettingsListFilterBar` para modal compacta compartilhada;
- cobrir equipe, departamentos, tags, tabulações, campos personalizados, canais, horários, contas de e-mail, produtos, catálogos, cotas, unidades e modelos de mensagem;
- preservar slots de cabeçalho, permissões e aplicação imediata dos grupos simples.

### Onda 7 — superfícies restantes

- Vagas;
- Atividades;
- Relatórios e Analytics;
- filtros de listagem do E-mail;
- logs do editor de automações;
- segmentos e superfícies legadas ainda roteadas;
- remover somente componentes comprovadamente órfãos, em mudança separada e após busca de consumidores.

## Regras de adaptação por página

- O modelo visual é compartilhado; os campos não são artificialmente uniformizados.
- Uma página sem tags não recebe coluna vazia de tags.
- Uma página com um único status usa modal compacta, não uma grade wide.
- Ordenação só aparece onde já existe.
- Filtros salvos só aparecem onde já há persistência ou requisito específico.
- Contadores exibem dados existentes; a padronização não cria chamadas extras apenas para ornamentação.
- Seleções extensas usam dropdown fechado com busca e scroll interno.
- Campos personalizados ocupam a largura necessária e usam grid baseado no container, não no viewport.

## Responsividade e acessibilidade

- Desktop: modal central com largura proporcional à variante.
- Tablet: redução progressiva de colunas sem cortar campos.
- Mobile: coluna única, cabeçalho e footer fixos, uma rolagem principal.
- Todos os controles possuem label acessível, estados de foco e navegação por teclado.
- A modal anuncia título, descrição e quantidade de filtros ativos.
- O botão de fechar, `Esc`, backdrop e retorno de foco seguem comportamento consistente.

## Estados e erros

- Opções remotas mostram carregamento, vazio e erro sem fechar a modal.
- Falha ao carregar opções não apaga filtros já aplicados.
- Aplicação inválida é bloqueada com mensagem no campo quando houver validação.
- Nenhuma modal dispara consultas duplicadas ao abrir.
- Fechar uma modal durante carregamento não altera o estado aplicado.

## Validação

Cada onda deve verificar:

1. paridade de todos os campos e valores atuais;
2. aplicação, cancelamento e limpeza;
3. contagem e chips de filtros;
4. URL, localStorage, paginação e query keys;
5. permissões e opções remotas;
6. estados vazio, carregando e erro;
7. desktop, mobile e tema escuro;
8. teclado, foco, `Esc` e retorno ao gatilho;
9. ausência de regressão nas chamadas de API.

## Fora de escopo

- mudanças de backend ou contratos de API;
- novos tipos de filtro;
- unificação dos stores de filtros;
- alteração de regras de negócio;
- redesign de formulários de criação/edição que não são filtros;
- conversão de navegação estrutural em filtro.

## Critério de conclusão

O trabalho termina quando todas as superfícies roteadas de filtragem usam o shell canônico ou uma variante explicitamente definida, preservam sua paridade funcional e foram validadas na `DEV_BRANCH`. Código legado órfão pode ser removido somente após confirmação independente de que não possui consumidores.
