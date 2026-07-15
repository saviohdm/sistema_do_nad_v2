# US-SECRETARIA-003 · Aterrissar na página Início e ir direto à fila certa

**Como** Secretária Processual da CN,
**eu quero** abrir o Início e em 5 segundos saber o que tem para fazer hoje,
**para** ir direto à ação (diligência, ciência ou cumprimento de providência) sem garimpar fila por fila.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`).

## Pré-condições
- Persona logada é Secretaria (`getHomeForPersona` → `secretaria-inicio.html`).

## Fluxo principal
1. Após o login, aterrissa no **Início**: hero com dateline, saudação e headline dinâmica
   (grupos prontos p/ diligência → grupos prontos p/ ciência → providências atrasadas →
   providências pendentes; zerado = "Sua mesa está limpa").
2. Vê **Filas operacionais** com 3 cards de mesmo peso:
   - **Aguardando diligência**: nº grande = grupos prontos (→ `?gruposCompletos=1`);
     secundários "proposições aguardando diligência" e "grupos parciais em formação".
   - **Aguardando ciência**: nº grande = grupos prontos (→ `?estado=completo&fila=1`);
     secundário "proposições aguardando ciência".
   - **Providências pendentes**: nº grande = pendências abertas; secundário
     "atrasadas há mais de 10 dias" (→ `?atrasadas=1`).
3. Clica no número, num secundário ou em **Abrir fila** e cai na fila já filtrada.
4. Lê os **Avisos** vigentes (o aviso do tipo Encaminhamento afeta diretamente a Secretaria).

## Fluxos alternativos
- **Sidebar em grupos** (Início / Filas operacionais / Serviços / Consulta) com ícones e badges
  nas três filas (grupos prontos p/ diligência · grupos prontos p/ ciência · providências pendentes).
- **Acesso a `dashboard.html`**: a Secretaria é redirecionada para o Início (a página segue
  existindo como "Estatísticas" do CN e fallback legado).
- **Outra persona acessa a URL**: redirecionada para sua própria home.

## Regras de negócio
- Mesmas definições de *grupo completo*, *grupo parcial* e *providência atrasada (>10 dias)* das
  filas (`listGruposAguardandoDiligencia`, `listGruposParciaisSecretaria`, `listProvidenciasAtrasadas`,
  `countPendenciasAbertas`) — a home nunca cria contagens próprias.
- Card zerado permanece visível com "Em dia — nenhuma pendência."
- **Mudança consciente vs. dashboard antigo**: a home não lista grupos individuais nem pré-seleciona
  checkboxes; a seleção em lote acontece na própria fila (US-secretaria-001/002). Nenhum dado de
  caso individual na home.

## Pós-condições
- Nenhuma: página somente-leitura (não grava estado nem eventos de histórico).

## Referências
- [secretaria-inicio-page.js](../assets/js/features/secretaria-inicio-page.js) — controlador da página
- [especificacao_inicio_corregedor.md](../especificacao_inicio_corregedor.md) — padrão Início (seção Fase 2)
- [US-corregedor-004-inicio.md](US-corregedor-004-inicio.md) — o mesmo padrão na persona CN
- [US-secretaria-001-aguardando-diligencia.md](US-secretaria-001-aguardando-diligencia.md) · [US-secretaria-002-aguardando-ciencia.md](US-secretaria-002-aguardando-ciencia.md) — filas de destino
