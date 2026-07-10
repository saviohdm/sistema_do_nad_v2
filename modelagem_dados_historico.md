# Modelagem de dados do Histórico (`historico`)

Referência da estrutura dos eventos de auditoria de uma proposição, conforme implementado hoje. Cada proposição carrega um array `historico` com todos os atos relevantes do seu ciclo de vida; a tela de detalhes exibe esse array como o Dossiê unificado (faixa "Em aberto", filtros por categoria e ciclos de diligência).

Fontes no código: [historico.js](assets/js/domain/historico.js) (envelope, categorização, ciclos), [enums.js](assets/js/domain/enums.js) (`TipoHistorico`), emissores citados evento a evento abaixo.

## Envelope comum

Todo evento nasce em `buildHistoryEvent(tipo, usuario, extras)` ([historico.js](assets/js/domain/historico.js)):

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único (`hist-<n>` via `uid`) |
| `tipo` | enum `TipoHistorico` | Um dos 25 tipos catalogados abaixo |
| `data` | string ISO datetime | Data **e hora** do ato |
| `usuario` | string | Responsável pelo ato (nome da persona ou nome próprio); texto livre, sem id |
| _...extras_ | — | Campos específicos do tipo, espalhados no mesmo nível |

Comportamentos do agregado:

- `appendHistory` insere e **reordena o array por `data` ascendente** a cada inserção.
- `removeHistoryEvent` existe apenas para a remoção de avaliação pelo Corregedor (o conteúdo sai do histórico material; fica só o tombstone `avaliacao_removida_pelo_corregedor`).
- Campos derivados **não persistidos** (calculados na leitura): categoria e flag decisória (`categorizarEventoHistorico`) e o agrupamento em ciclos de diligência (`agruparHistoricoPorCiclos`).

## Objeto `apreciacao` embutido

Avaliações e decisões carregam o juízo em duas camadas com schema único (autor-agnóstico, cf. SPECS.md):

```js
apreciacao: {
  situacao,                    // "necessita_mais_informacoes" | "concluida"
  tipoConclusao,               // só quando concluída: cumprida | parcialmente_cumprida |
                               // nao_cumprida | prejudicada | encerrada
  existeProvidenciaSecretaria, // só válido em parcialmente_cumprida / nao_cumprida
  tipoProvidencia,             // corregedoria_local | coci | outra
  observacoes,                 // texto livre do juízo
}
```

## Catálogo por tipo de evento

### Categoria: fluxo principal

| Tipo | Emissor | Campos além do envelope |
|---|---|---|
| `criacao` | `criarProposicao` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` (3 variantes: criação normal, como rascunho, em correição já referendada) |
| `edicao` | `editarProposicao` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` fixa — não registra o diff dos campos |
| `edicao_metadados` | `editarMetadados` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` (diff em texto), `prioridadeAnterior`, `prioridadeNova`, `sensivelAnterior`, `sensivelNovo` |
| `rascunho_cn_confirmado` | `confirmarRascunhoCN` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` (2 variantes conforme referendo da correição) |
| `apagamento_proposicao` | `markPropositionDeleted` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` (tombstone do encerramento) |
| `referendo_cnmp` | `referendarCorreicao` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao`, `correicaoId` |
| `relatorio_final_gerado` | — (ver Pontos de atenção) | — |
| `criacao_diligencia` | `criarDiligencia` ([diligencias.js](assets/js/domain/diligencias.js)) | `descricao`, `prazoComprovacao` (date), `diligenciaId`, `loteId` (opcional, diligência em lote) |
| `comprovacao` | `registrarComprovacao` ([diligencias.js](assets/js/domain/diligencias.js)) | `descricao`, `observacoes`, `anexos[]`, `diligenciaId` |
| `prazo_comprovacao_expirado` | `expirarDiligenciasVencidas` ([diligencias.js](assets/js/domain/diligencias.js)) | `descricao` (2 variantes), `diligenciaId`, `prazoOriginal`, `rascunhoExistia` (bool); `usuario` = `"Sistema"` |
| `avaliacao_membro_auxiliar` | `salvarAvaliacaoMembro` ([avaliacoes.js](assets/js/domain/avaliacoes.js)) | `descricao`, `apreciacao{…}` |
| `decisao` | `deferirAvaliacao` / `indeferirAvaliacao` ([avaliacoes.js](assets/js/domain/avaliacoes.js)) | `descricao`, `modo` (`"deferimento"` \| `"indeferimento"`), `apreciacao{…}` |
| `avaliacao_com_forca_de_decisao` | `registrarAvaliacaoComForcaDeDecisao` ([avaliacoes.js](assets/js/domain/avaliacoes.js)) | `descricao`, `modo: null`, `apreciacao{…}` |
| `avaliacao_removida_pelo_corregedor` | `removerAvaliacao` ([avaliacoes.js](assets/js/domain/avaliacoes.js)) | `descricao`, `avaliacaoRemovidaId` |

Schema dos `anexos[]` da comprovação: `{ nome, tamanhoBytes, mimeType, anexadoEm }` (o protótipo registra apenas metadados do arquivo, não o conteúdo).

Eventos **decisórios** (destaque visual no Dossiê): `decisao` e `avaliacao_com_forca_de_decisao`.

### Categoria: comunicações

| Tipo | Emissor | Campos além do envelope |
|---|---|---|
| `cientificacao` | `cientificarProposicao` ([ciencia.js](assets/js/domain/ciencia.js)) | `descricao` fixa — sem referência ao destinatário ou à decisão |
| `email_diligencia_enviado` | `adicionarEmailDiligencia` ([caixa-de-saida.js](assets/js/domain/caixa-de-saida.js)) | `descricao` (nome + e-mail do notificado), `usuarioNotificadoId`, `usuarioNotificadoEmail`, `override` (bool), `motivoOverride`, `caixaSaidaId`, `diligenciaId` |
| `email_ciencia_enviado` | `adicionarEmailCiencia` ([caixa-de-saida.js](assets/js/domain/caixa-de-saida.js)) | idem acima, **sem** `diligenciaId` (ciência é por proposição/grupo) |
| `visualizacao_ciencia_correicionado` | `registrarVisualizacaoCiencia` ([correicionados.js](assets/js/domain/correicionados.js)) | `descricao` (nome + cargo), `userIdCorreicionado` |

`override: true` indica que a Secretaria definiu manualmente o destinatário da comunicação (diferente do sugerido pela orientação da proposição).

### Categoria: providências

| Tipo | Emissor | Campos além do envelope |
|---|---|---|
| `cumprimento_pendencia_secretaria` | `registrarCumprimentoPendencia` ([pendencias-secretaria.js](assets/js/domain/pendencias-secretaria.js)) | `descricao`, `observacoes`, `dataCumprimento` |

### Categoria: rascunhos

Os eventos `_salvo` registram apenas o **primeiro** salvamento (saves subsequentes só atualizam o objeto de rascunho na proposição); os eventos `_descartado` registram cada descarte explícito. O conteúdo do rascunho **não** vai para o histórico — vive no objeto `rascunhoX` da proposição, com envelope comum `{ ...payload, salvoEm, salvoPor, salvoPorId }` (ver SPECS.md, "Rascunhos de ação (modelo canônico)").

| Tipo | Emissor | Campos além do envelope |
|---|---|---|
| `rascunho_decisao_cn_salvo` | `salvarRascunhoDecisaoCN` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` |
| `rascunho_decisao_cn_descartado` | `descartarRascunhoDecisaoCN` ([proposicoes.js](assets/js/domain/proposicoes.js)) | `descricao` |
| `rascunho_avaliacao_salvo` | `salvarRascunhoAvaliacao` ([avaliacoes.js](assets/js/domain/avaliacoes.js)) | `descricao` |
| `rascunho_avaliacao_descartado` | `descartarRascunhoAvaliacao` ([avaliacoes.js](assets/js/domain/avaliacoes.js)) | `descricao` |
| `rascunho_comprovacao_salvo` | `salvarRascunhoComprovacao` ([diligencias.js](assets/js/domain/diligencias.js)) | `descricao` |
| `rascunho_comprovacao_descartado` | `descartarRascunhoComprovacao` ([diligencias.js](assets/js/domain/diligencias.js)) | `descricao` |

## Visibilidade por persona

O correicionado enxerga somente os atos formais e comunicações dirigidas a ele — 13 tipos, definidos em `VISIBLE_TO_CORREICIONADO` ([correicionados.js](assets/js/domain/correicionados.js)): `criacao`, `edicao`, `referendo_cnmp`, `criacao_diligencia`, `comprovacao`, `prazo_comprovacao_expirado`, `decisao`, `avaliacao_com_forca_de_decisao`, `cientificacao`, `cumprimento_pendencia_secretaria`, `email_diligencia_enviado`, `email_ciencia_enviado`, `apagamento_proposicao`.

Os 12 tipos restantes (avaliação do membro auxiliar, remoção de avaliação, edição de metadados, confirmação de rascunho de criação, os seis eventos de rascunho, visualização de ciência, relatório final) são internos à CN. As demais personas veem o histórico completo.

## Pontos de atenção (estado atual)

1. `relatorio_final_gerado` existe no enum mas **nenhum código o emite** (nem o seed).
2. `cumprimento_pendencia_secretaria` tem **dois emissores divergentes**: o domínio (`registrarCumprimentoPendencia`, usado pela fila de providências) grava `dataCumprimento`; a tela de detalhes ([proposicao-detalhe-page.js](assets/js/features/proposicao-detalhe-page.js), handler `data-pendencia-form`) monta o evento manualmente **sem** `dataCumprimento` e sem reusar o domínio.
3. Dois pontos fogem do `buildHistoryEvent` e usam `crypto.randomUUID()` como id: `markPropositionDeleted` e o cumprimento emitido pela tela de detalhes.
4. `encaminharParaSecretaria` ([proposicoes.js](assets/js/domain/proposicoes.js)) emitiria um segundo evento `criacao` para um ato de encaminhamento, mas **não tem chamadores** (código morto).
5. `edicao` não registra quais campos mudaram, diferente de `edicao_metadados` (que guarda antes/depois).
6. O responsável (`usuario`) é sempre texto livre; nenhum evento guarda o **id do autor** — apenas o do notificado (e-mails) e o do correicionado (visualização de ciência).
