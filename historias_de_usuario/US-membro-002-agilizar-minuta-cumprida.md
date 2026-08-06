# US-MEMBRO-002 · Agilizar minuta cumprida

**Como** membro auxiliar da CN,  
**eu quero** receber uma minuta cumprida previamente preenchida,  
**para que** eu possa submeter diretamente os casos de cumprimento integral, que representam a maioria do trabalho.

## Ator
Membro Auxiliar da CN (`PERSONAS.MEMBRO`).

## Pré-condições
- Existe proposição disponível para elaboração de minuta.
- Não existe `rascunhoAvaliacao` ativo para a proposição.
- Para a ação rápida da fila, existe comprovação registrada e não existe minuta vigente.

## Fluxo principal
1. Na fila **Minha fila de elaboração de minutas**, o cartão elegível mantém o acesso **Elaborar minuta** e exibe a ação **Submeter minuta**.
2. O membro clica em **Submeter minuta** e confirma a proposição e o resultado `Concluída · Cumprida`.
3. O sistema submete a minuta padrão, com `Existe providência da Secretaria? = Não` e a redação “Acolho a comprovação apresentada, por demonstrar o cumprimento integral da proposição do CNMP.”
4. A submissão transita para `AGUARDANDO_DECISAO_CORREGEDOR` e o cartão desaparece da fila sem alerta adicional.

## Fluxos alternativos
- **Alteração sem edição da redação**: mudar `Situação` ou `Tipo de conclusão` limpa o texto genérico e revela o placeholder existente; voltar às opções anteriores não restaura o modelo nessa abertura.
- **Redação editada**: a primeira digitação transforma o texto em conteúdo manual e mudanças posteriores de situação ou conclusão não o apagam.
- **Salvar rascunho**: o conteúdo atual passa a ser persistido e não sofre limpeza automática na mesma abertura nem quando retomado.
- **Retomar rascunho**: os valores salvos, inclusive campos vazios, prevalecem integralmente sobre os padrões.
- **Descartar rascunho ou iniciar novo ciclo após devolução**: a proposição volta a não ter rascunho e recebe novamente os padrões de minuta nova.
- **Prazo expirado sem comprovação**: o cartão não exibe a ação rápida; o membro abre o detalhe e redige uma minuta adequada ao caso.
- **Rascunho existente**: o cartão exibe **Retomar minuta**, ainda que o rascunho esteja completo, e não permite submissão rápida.
- **Cancelamento**: cancelar a confirmação mantém a proposição e seu estado inalterados.

## Regras de negócio
- O preenchimento é um atalho de interface; não cria histórico, não altera status e não produz efeitos antes da submissão.
- Os padrões valem para toda minuta nova do membro, independentemente da origem da navegação.
- Os demais campos, suas validações e as regras de providência permanecem inalterados.
- A minuta continua sendo ato preparatório sem efeito vinculante até decisão do Corregedor Nacional.

## Pós-condições
- Na submissão direta, o evento de minuta contém a apreciação cumprida e a redação padrão.
- Em edição ou rascunho, prevalece sempre o conteúdo informado ou salvo pelo membro.

## Referências
- [forms.js — formulário e controlador da redação automática](../assets/js/ui/forms.js)
- [proposicao-detalhe-page.js — configuração da minuta do membro](../assets/js/features/proposicao-detalhe-page.js)
- [US-MEMBRO-001 — rascunhar minuta](US-membro-001-rascunhar-minuta.md)
