# US-CORREGEDOR-004 · Aterrissar na página Início e se orientar para o trabalho

**Como** Corregedor Nacional,
**eu quero** aterrissar em uma página Início que diga o que exige minha ação e onde está cada função,
**para que** eu chegue às minhas duas filas operacionais em um clique, sem procurar o trabalho em um painel de estatísticas.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`).

## Pré-condições
- Persona CN selecionada no login (`getHomeForPersona` → `corregedor-inicio.html`).

## Fluxo principal
1. Após o login, aterrissa no **Início**: hero com dateline, saudação e headline dinâmica
   (decisões → rascunhos de decisão → referendos → rascunhos de criação; zerado = "Sua mesa está limpa").
2. Vê a seção **Filas operacionais** com 2 cards de mesmo peso: *Aguardando decisão* (nº grande +
   "com avaliação submetida" + "com rascunho a retomar") e *Aguardando referendo do CNMP* (nº grande +
   "correições prontas para referendar" + "rascunhos de criação a confirmar").
3. Clica no número, num secundário (fila já filtrada) ou em **Abrir fila**.
4. Alternativamente usa **Serviços** (Correições · Criar proposição · Administração Superior) ou os
   links de Consulta e Estatísticas.
5. Lê os **Avisos** vigentes (badge textual de severidade + vigência); aviso `critico` aparece como
   banner `role="alert"` acima do hero.

## Fluxos alternativos
- **Sidebar em 5 grupos** (Início / Filas operacionais / Serviços / Consulta / Estatísticas), com
  ícones e badges de pendência nas duas filas; botão **Recolher menu** persiste o estado por navegador.
- **Estatísticas**: o antigo Dashboard, demovido, contendo apenas o Panorama (4 cartões gráficos).
- **Outra persona acessa a URL**: redirecionada para sua própria home (`getHomeForPersona`).

## Regras de negócio
- Os números dos cards usam os mesmos seletores das filas (`countPendentesDoCorregedor` etc.) —
  nunca contagens próprias divergentes; nenhum número aparece duas vezes na página.
- Nenhum dado de caso individual, nome próprio ou flag "sensível" na home (minimização).
- Card zerado permanece visível com "Em dia — nenhuma pendência."
- Aviso fora de vigência (`hoje ∉ [vigenciaInicio, vigenciaFim]`) nunca renderiza; sem avisos
  vigentes, a seção não existe.

## Pós-condições
- Nenhuma: página somente-leitura (não grava estado nem eventos de histórico).

## Referências
- [especificacao_inicio_corregedor.md](../especificacao_inicio_corregedor.md) — especificação completa (A–N)
- [corregedor-inicio-page.js](../assets/js/features/corregedor-inicio-page.js) — controlador da página
- [avisos.js](../assets/js/domain/avisos.js) — `listAvisosVigentes`
- [layout.js](../assets/js/ui/layout.js) — grupos de menu, badges do CN e sidebar recolhível
- [dashboard-page.js](../assets/js/features/dashboard-page.js) — visão CN reduzida a "Estatísticas"
