# Sistema de Proposições do NAD

Protótipo web do **Núcleo de Acompanhamento de Determinações (NAD)** para acompanhar proposições originadas de correições do Ministério Público. O sistema organiza o trabalho por persona, registra a tramitação de cada proposição e preserva a trilha de auditoria dos atos praticados.

> **Estado do projeto:** protótipo front-end funcional. Não há backend, banco de dados, autenticação real ou integrações externas. Os dados de demonstração são mantidos no `localStorage` do navegador e não devem ser usados como dados de produção.

## Fluxo representado

```text
Correição no SCI
  → cadastro ou migração para o NAD
  → criação e referendo da proposição
  → diligência pela Secretaria
  → comprovação pelo correicionado ou expiração do prazo
  → minuta do Membro Auxiliar
  → decisão do Corregedor Nacional
  → ciência e baixa definitiva
```

Quando a decisão exigir mais informações, a proposição retorna à Secretaria para uma nova diligência. Eventuais providências administrativas são acompanhadas em paralelo e não bloqueiam a conclusão do fluxo principal.

## Funcionalidades

### Corregedor Nacional

- consulta o panorama e as filas operacionais;
- cadastra e gerencia correições e proposições;
- referenda proposições migradas;
- acolhe, afasta ou devolve minutas do Membro Auxiliar;
- profere decisão direta nos casos admitidos;
- consulta relatórios de decisão, produtividade e situação;
- acompanha providências administrativas.

### Membro Auxiliar da CN

- consulta sua fila de proposições;
- analisa comprovações e o histórico do caso;
- salva, retoma e descarta rascunhos;
- elabora e submete minutas de decisão;
- navega sequencialmente pelos itens da fila.

### Secretaria Processual da CN

- cria diligências e controla seus prazos;
- confirma os destinatários das comunicações;
- registra ciências em lote;
- acompanha e informa o cumprimento de providências;
- consulta filas e indicadores operacionais.

### Correicionado

- acessa as proposições destinadas a si ou às unidades sob sua responsabilidade;
- salva e envia comprovações de diligências;
- consulta decisões finais;
- registra a ciência das proposições com baixa definitiva.

## Regras de negócio centrais

- Somente a decisão do **Corregedor Nacional** produz efeitos concretos. A minuta do Membro Auxiliar é um ato preparatório.
- A apreciação possui duas camadas: situação (`necessita mais informações` ou `concluída`) e, quando concluída, um resultado final.
- Acolher uma minuta copia integralmente seu conteúdo para a decisão; afastá-la exige uma decisão substitutiva; devolvê-la remove o conteúdo material e devolve o item à fila do Membro Auxiliar.
- Rascunhos são privados, não mudam a fase do processo e não produzem efeitos.
- Os atos relevantes são registrados no histórico da proposição.
- A orientação do destinatário torna-se imutável após a ativação da proposição.
- Providências da Secretaria são controles administrativos paralelos: o sistema registra o cumprimento, mas não executa a providência.

As regras completas estão em [SPECS.md](SPECS.md).

## Tecnologias e arquitetura

- HTML5 e CSS3;
- JavaScript sem framework, organizado em ES Modules;
- `localStorage` para persistência local do protótipo;
- `node:test` para testes automatizados;
- pdfmake, distribuído em `assets/vendor/`, para geração de relatórios PDF no navegador.

Não há etapa de build nem dependências que precisem ser instaladas com npm.

```text
.
├── index.html                 # redirecionamento para o login
├── pages/                     # uma página HTML por tela
├── assets/
│   ├── css/                   # tokens, base, componentes e estilos de páginas
│   ├── data/seed.js           # estado inicial de demonstração
│   ├── js/
│   │   ├── app/               # autenticação simulada, estado e bootstrap
│   │   ├── domain/            # entidades e regras de negócio
│   │   ├── features/          # controladores das páginas
│   │   └── ui/                # componentes e renderizadores compartilhados
│   └── vendor/                # dependências distribuídas com o projeto
├── tests/                     # testes com o runner nativo do Node.js
└── historias_de_usuario/      # jornadas funcionais por persona
```

## Como executar

### Pré-requisitos

- Node.js 20 ou superior;
- navegador moderno com suporte a ES Modules.

Na raiz do repositório, inicie o servidor local:

```bash
node .claude/dev-server.mjs
```

Acesse [http://localhost:8080](http://localhost:8080). Para usar outra porta:

```bash
PORT=3000 node .claude/dev-server.mjs
```

O projeto deve ser servido por HTTP. Abrir os arquivos HTML diretamente por `file://` pode impedir o carregamento dos módulos e das rotas absolutas.

## Acesso ao protótipo

A tela inicial permite escolher uma das quatro personas. Não há senha:

1. selecione `Corregedor Nacional`, `Membro Auxiliar da CN`, `Secretaria Processual da CN` ou `Correicionado`;
2. ao entrar como correicionado, selecione também um membro do diretório CNMP simulado;
3. clique em **Entrar**.

A persona e o usuário atual também são armazenados localmente no navegador.

## Dados de demonstração

Na primeira execução, [assets/data/seed.js](assets/data/seed.js) popula a chave `nad-sistema-state-v6` do `localStorage`. As alterações feitas na interface permanecem disponíveis para a mesma origem e o mesmo navegador.

Para recomeçar, use o botão **Restaurar dados iniciais** disponível nas telas autenticadas. Essa ação descarta as alterações locais e reaplica o estado de demonstração.

## Testes

Execute toda a suíte com:

```bash
node --test tests/*.test.mjs
```

Os testes cobrem regras de apreciação e decisão, comprovações, histórico, filas navegáveis, migrações de estado, relatórios, estatísticas, textos longos e comportamento responsivo do layout.

## Documentação funcional

- [SPECS.md](SPECS.md): especificação funcional e invariantes do domínio;
- [passos_do_processo_nad.md](passos_do_processo_nad.md): fluxo detalhado por persona;
- [modelagem_dados_historico.md](modelagem_dados_historico.md): modelo da trilha de auditoria;
- [especificacao_inicio_corregedor.md](especificacao_inicio_corregedor.md): especificação da página inicial do Corregedor;
- [historias_de_usuario/](historias_de_usuario/): histórias de usuário implementadas ou planejadas;
- [Excalidraw.excalidraw](Excalidraw.excalidraw): diagrama visual editável no Excalidraw.

## Limitações atuais

- autenticação e autorização são apenas simulações no cliente;
- o diretório CNMP é representado pelos dados locais do protótipo;
- e-mails são registrados em uma caixa de saída simulada;
- anexos são representados por metadados, sem armazenamento real de arquivos;
- os dados não são compartilhados entre navegadores ou usuários;
- não há API, banco de dados, SSO, observabilidade ou infraestrutura de implantação.

## Desenvolvimento

Ao alterar o projeto:

1. mantenha regras de negócio em `assets/js/domain/` e controladores de tela em `assets/js/features/`;
2. preserve a compatibilidade das chaves e identificadores legados documentados em `SPECS.md`;
3. atualize a trilha de auditoria para todo novo ato relevante;
4. adicione ou ajuste os testes correspondentes;
5. execute a suíte completa antes de entregar a mudança.
