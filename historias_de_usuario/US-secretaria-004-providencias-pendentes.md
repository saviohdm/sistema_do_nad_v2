# US-SECRETARIA-004 · Providências pendentes

**Como** Secretária Processual da CN,
**eu quero** ver a relação de providências pendentes que devo adotar em razão da conclusão das proposições, com contexto suficiente para agir sem abrir cada caso,
**para** despachar externamente (ofícios à Corregedoria local, à COCI ou outras providências) com prioridade clara e registrar o cumprimento de cada uma.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`, permissão `cumprir_pendencia_secretaria`).

## Pré-condições
- Persona logada é Secretaria.
- Existe ao menos uma proposição com qualquer resultado conclusivo e `apreciacaoDoCN.existeProvidenciaSecretaria = true`, gerando entrada em `pendenciasSecretaria[]` com `status = "pendente"`.

## Fluxo principal
1. Acessa **Providências pendentes** no menu lateral.
2. Vê o panorama com 2 KPIs clicáveis — **Providências pendentes** (total) e **Atrasadas (mais de 10 dias)** — e, abaixo, a fila agrupada por proposição, ordenada pela providência mais antiga em aberto (decrescente em dias).
3. Cada section traz contexto da proposição: número, unidade, tipo, descrição truncada, linha de metadados em texto discreto (correição-mãe e membro designado) e no máximo 3 badges — sensível, prioridade (apenas quando urgente/importante) e conclusão que originou a providência.
4. Cada card de providência mostra o tipo como overline (`Encaminhamento à Corregedoria local` / `COCI` / `Outra providência`), descrição, um único badge `Há N dias em aberto` (vermelho quando >10 dias, com filete lateral no card) e bloco colapsável **"Fundamentos da decisão que originou a providência"** com o texto de `apreciacaoDoCN.observacoes`.
5. Filtra pela **busca exposta** (número/descrição, aplicação imediata enquanto digita) e pelo disclosure **"Filtros"** (correição-mãe + chips de `tipoProvidencia` com contagem por destino, multi-seleção). Com o painel fechado, filtros ativos aparecem como chips removíveis; "Limpar filtros" só aparece quando há filtro ativo.
6. Clica em **"Registrar cumprimento"** no card → formulário expande inline com `dataCumprimento` pré-preenchida com a data de hoje; preenche `observações` (referência ao ofício, número, destinatário) e submete — ou cancela para recolher.
7. Sistema invoca `registrarCumprimentoPendencia`, atualiza `status="cumprida"`, registra evento `CUMPRIMENTO_PENDENCIA_SECRETARIA` no `historico` e remove o card da tela.

## Fluxos alternativos
- **Vazio com filtros**: nenhuma providência atende aos filtros → mensagem "Nenhuma providência atende aos filtros selecionados.".
- **Vazio sem filtros**: nenhuma providência pendente em todo o sistema → mensagem "Nenhuma providência pendente no momento.".
- **Atrasadas**: KPI "Atrasadas" do panorama aplica o filtro (`atrasadas=1`) e mantém apenas providências em aberto há mais de 10 dias; o título da página passa a "Providências pendentes atrasadas".
- **Abrir proposição**: botão "Abrir proposição" no header leva ao detalhe da proposição, onde o histórico completo (incluindo providências cumpridas) está disponível.
- **F5 / link compartilhado**: filtros persistidos em URL params (`atrasadas`, `tipo`, `correicao`, `q`).

## Regras de negócio
- Providências são controles administrativos paralelos: o cumprimento ocorre **fora do sistema**; aqui apenas se registra `dataCumprimento` e `observações`.
- Providências **não bloqueiam** transições do fluxo principal — uma proposição pode chegar a `BAIXA_DEFINITIVA` com providências ainda pendentes (ver [US-secretaria-002-aguardando-ciencia.md](US-secretaria-002-aguardando-ciencia.md)).
- A tela exibe **apenas providências com `status = "pendente"`**; cumpridas continuam disponíveis no histórico da proposição via evento `CUMPRIMENTO_PENDENCIA_SECRETARIA`.
- Ordenação prioriza a providência mais antiga em aberto (atrasadas naturalmente sobem ao topo).
- Qualquer um dos cinco resultados conclusivos pode gerar providência; quando o tipo for `outra_providencia`, a descrição personalizada é exibida no card (ver [SPECS.md](../SPECS.md)).

## Pós-condições
- Cada providência cumprida tem `status="cumprida"`, `dataCumprimento` e `observacoes` registrados.
- Evento `CUMPRIMENTO_PENDENCIA_SECRETARIA` adicionado ao `historico` da proposição.
- Card removido da fila imediatamente após submissão.

## Referências
- [secretaria-providencia-page.js](../assets/js/features/secretaria-providencia-page.js)
- [pendencias-secretaria.js](../assets/js/domain/pendencias-secretaria.js)
- [secretaria-filas.js:266](../assets/js/domain/secretaria-filas.js) — `listFilaPendenciasProvidencia`
- [enums.js](../assets/js/domain/enums.js) — `TipoProvidencia`, `TipoConclusao`, `TipoHistorico.CUMPRIMENTO_PENDENCIA_SECRETARIA`
- [SPECS.md](../SPECS.md) — provisão como controle administrativo paralelo
- [passos_do_processo_nad.md](../passos_do_processo_nad.md) — Secretaria Processual da CN
