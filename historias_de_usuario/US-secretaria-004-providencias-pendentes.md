# US-SECRETARIA-004 · Providências pendentes

**Como** Secretária Processual da CN,
**eu quero** ver a relação de providências pendentes que devo adotar em razão da conclusão das proposições, com contexto suficiente para agir sem abrir cada caso,
**para** despachar externamente (ofícios à Corregedoria local, à COCI ou outras providências) com prioridade clara e registrar o cumprimento de cada uma.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`, permissão `cumprir_pendencia_secretaria`).

## Pré-condições
- Persona logada é Secretaria.
- Existe ao menos uma proposição cujo `apreciacaoDoCN.tipoConclusao` é `parcialmente_cumprida` ou `nao_cumprida`, com `apreciacaoDoCN.existeProvidenciaSecretaria = true`, gerando entrada em `pendenciasSecretaria[]` com `status = "pendente"`.

## Fluxo principal
1. Acessa **Providências pendentes** no menu lateral.
2. Vê a fila agrupada por proposição, ordenada pela providência mais antiga em aberto (decrescente em dias).
3. Cada section traz contexto da proposição: número, unidade, tipo, descrição truncada, correição-mãe, ramo MP, temática, UF, prioridade, membro designado e badge da conclusão (`parcialmente_cumprida` / `nao_cumprida`) que originou a providência.
4. Cada card de providência mostra tipo (`Encaminhamento à Corregedoria local` / `COCI` / `Outra providência`), descrição, dias em aberto e bloco colapsável **"Fundamentos da decisão que originou a providência"** com o texto de `apreciacaoDoCN.observacoes`.
5. Aplica filtros (`tipoProvidencia` / correição-mãe / busca textual / "somente atrasadas") — totalizadores no toolbar atualizam por destino (X Local · Y COCI · Z Outra).
6. Para cada providência, preenche `dataCumprimento` (o despacho externo já ocorreu) e `observações` (referência ao ofício, número, destinatário); submete.
7. Sistema invoca `registrarCumprimentoPendencia`, atualiza `status="cumprida"`, registra evento `CUMPRIMENTO_PENDENCIA_SECRETARIA` no `historico` e remove o card da tela.

## Fluxos alternativos
- **Vazio com filtros**: nenhuma providência atende aos filtros → mensagem "Nenhuma providência atende aos filtros selecionados.".
- **Vazio sem filtros**: nenhuma providência pendente em todo o sistema → mensagem "Nenhuma providência pendente no momento.".
- **Atrasadas**: filtro "Somente atrasadas" mantém apenas providências em aberto há mais de 10 dias; badge `Há N dias em aberto` em vermelho.
- **Abrir proposição**: botão "Abrir proposição" no header leva ao detalhe da proposição, onde o histórico completo (incluindo providências cumpridas) está disponível.
- **F5 / link compartilhado**: filtros persistidos em URL params (`atrasadas`, `tipo`, `correicao`, `q`).

## Regras de negócio
- Providências são controles administrativos paralelos: o cumprimento ocorre **fora do sistema**; aqui apenas se registra `dataCumprimento` e `observações`.
- Providências **não bloqueiam** transições do fluxo principal — uma proposição pode chegar a `BAIXA_DEFINITIVA` com providências ainda pendentes (ver [US-secretaria-002-aguardando-ciencia.md](US-secretaria-002-aguardando-ciencia.md)).
- A tela exibe **apenas providências com `status = "pendente"`**; cumpridas continuam disponíveis no histórico da proposição via evento `CUMPRIMENTO_PENDENCIA_SECRETARIA`.
- Ordenação prioriza a providência mais antiga em aberto (atrasadas naturalmente sobem ao topo).
- Apenas decisões com `tipoConclusao` em `{parcialmente_cumprida, nao_cumprida}` podem gerar providência; "cumprida", "prejudicada" e "encerrada_sem_analise_de_merito" não geram (ver [SPECS.md](../SPECS.md)).

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
