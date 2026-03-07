# ArqueOps Tube — System Context (Auto-Generated)

> Auto-generated hourly by the ArqueOps orchestrator. Do NOT edit manually.

## Project Info
- **Name**: ArqueOps Tube
- **Slug**: arqueops-tube
- **Description**: Automated YouTube video production platform. 12-step pipeline: ideation, script, TTS, images, rendering, export.
- **GitHub**: brenowilson/arqueops-tube
- **Default Branch**: main
- **Supabase**: https://zackpaccyxhnagrjhysv.supabase.co
- **Tech Stack**: {"ui":"shadcn/ui","llm":"Claude (Anthropic SDK)","tts":"Azure Speech Services","react":"React 19","video":"FFmpeg + VideoToolbox","images":"Google ImageFX","backend":"Supabase","styling":"Tailwind CSS 4","frontend":"Next.js 16","typescript":"strict"}

## ArqueOps Orchestrator
This project is managed by the ArqueOps autonomous orchestrator.
All work follows the ArqueOps DNA (Visions, Concepts, Workers, Workflows, Evaluation Criteria).

## ArqueOps DNA (embedded — internal project)

# ArqueOps — System DNA (Auto-Generated)

> Auto-generated hourly from the database. Do NOT edit manually.

## DNA Pillars
ArqueOps operates on 5 DNA pillars. Every decision must align with them.

1. **Visions** — Strategic directions (WHERE). Table: `system_visions`
2. **Concepts** — Formal definitions (HOW). Table: `system_concepts`
3. **Workers** — Atomic execution units (input→actions→output). Table: `workers`
4. **Workflows** — Compositions of Workers AND Workflows with routing/decisions. Table: `workflows`
5. **Evaluation Criteria** — Quality standards for consensus. Table: `evaluation_criteria`

**Navigation**: Use semantic search on the respective table to get details about any item.
**Principle**: Everything in the system should become a Concept, Worker, Workflow, or Criterion.

## SYSTEM CONCEPTS
These are the formal concepts that define how this system operates. Use them to evaluate decisions.

### Acceptance Criteria (`acceptance_criteria`)
Definition of "done" for each task: 3-10 testable criteria that can be verified with a yes/no answer by the automated review system.
- **Expected result**: Every task has clear, testable criteria that an automated review can verify.
- **Example**: Task has criteria: "1. New endpoint returns 200 with valid token. 2. Returns 401 without token. 3. Rate limited to 100 req/min." — each verifiable.
- **Non-example**: Task description says "implement authentication" with no measurable success criteria.

### Agent Memory (`agent_memory`)
Cross-project lessons learned via semantic search. Agents learn from past executions across all projects, building institutional knowledge over time.
- **Expected result**: Agents don't repeat mistakes; patterns from past executions inform current decisions.
- **Example**: Before a migration task, vector search finds that a similar migration caused downtime → agent adds safeguards based on the lesson learned.
- **Non-example**: Agent makes the same mistake twice because lessons from previous executions are not accessible.

### Asset Ownership (`asset_ownership`)
Todo artefato produzido pelo sistema (código, PR, conteúdo, documento, automação) DEVE ter um agente responsável designado. Quando uma demand é completada, os agentes que contribuíram são vinculados aos ativos criados. Isso gera: rastreabilidade de autoria, portfólio de competências por agente, base para performance score mais granular, e mapa de "donos" para manutenção e evolução futura dos ativos.
- **Expected result**: Todo PR mergeado tem agentes vinculados aos artefatos criados. Quando surge um bug ou evolução num componente, o task_router sabe quem é o owner e prioriza esse agente. Cada agente constrói um portfólio de ativos sob sua responsabilidade.
- **Example**: Bezalel cria um componente React e é registrado como owner. 3 meses depois, surge um bug nesse componente — o task_router prioriza Bezalel porque ele é o dono e tem mais contexto. Natã escreveu os testes desse componente — é co-owner da suite de testes.
- **Non-example**: Um PR é mergeado com 5 tasks de 3 agentes diferentes, mas nenhum registro existe de quem criou qual artefato. Quando surge um bug, o task_router não sabe qual agente tem mais contexto sobre aquele código e atribui aleatoriamente.

### Auto Merge (`auto_merge`)
Autonomous PR merge when ALL conditions met: acceptance criteria exist, 100% criteria passed in review, CI checks pass, review score >= 0.8, no PR conflicts.
- **Expected result**: PRs that meet all quality gates merge without human intervention.
- **Example**: PR passes CI, Jeremias reviews with 0.92 score, all 5 acceptance criteria verified → auto-merged without human involvement.
- **Non-example**: PR is auto-merged despite having 2 failing acceptance criteria because the overall score was high.

### Channels (`channels`)
Fontes de dados externas registradas no sistema por onde Extractors coletam informações. Cada Channel representa uma porta ou janela para o mundo exterior — plataformas, sites, APIs, bases de dados públicas. Channels têm tipo (social_media, research, analytics, news), método de acesso (API, web scraping, RSS, search), e configuração específica. O sistema mantém um registro de Channels disponíveis e novos Channels podem ser propostos pelo self-improvement loop quando uma necessidade de dados é detectada.
- **Expected result**: O sistema tem um registro centralizado de todos os canais disponíveis para extração de dados. Quando um agente ou setor precisa de dados externos, consulta os Channels registrados. Novos Channels são propostos e criados autonomamente quando gaps são detectados.
- **Example**: Channel "YouTube" (tipo: social_media, método: YouTube Data API) registrado no sistema. Channel "McKinsey Insights" (tipo: research, método: web scraping). Enoque detecta que o setor Marketing precisa de dados do Instagram → propõe criação do Channel "Instagram" com Extractor correspondente via self-improvement loop.
- **Non-example**: Cada agente inventa seu próprio método de acessar dados externos, sem registro central. O sistema não sabe quais fontes de dados existem e não pode propor novas. Ou canais são hardcoded no código sem possibilidade de extensão autônoma.

### Concept (`concept`)
Definicao formal de um ativo, mecanismo, padrao ou entidade CONCRETO que EXISTE (ou deve existir) no sistema. Um Concept responde "O que e X?" e "Como X funciona?". E verificavel por evidencia concreta — voce consegue apontar pra uma tabela, funcao, worker, workflow ou padrao no codigo que materializa o conceito. Concepts materializam partes especificas de uma ou mais Visions, transformando direcoes abstratas em mecanismos concretos. Concepts podem ser propostos por agentes (via self-improvement/consensus) porque sao descobertas de padroes estruturais — inclusive padroes embutidos em Visions que ainda nao foram formalizados.
- **Expected result**: Todo mecanismo, padrao ou entidade relevante do sistema tem um Concept formalizado com description, expected_result, example e non_example. Agentes descobrem novos Concepts a partir de Visions (conceitos mencionados mas nao formalizados) e de padroes no activity_log (conceitos que existem na pratica mas nao estao documentados). Cada Concept formalizado amplia a capacidade do sistema de rastrear, avaliar e evoluir.
- **Example**: Worker: define o que e uma unidade atomica de execucao — verificavel nos workers do orchestrator. Consensus Loop: define o padrao de avaliacao multi-round — verificavel em consensus_loops e consensus_discussions. Setores/Departamentos: define agrupamento organizacional — tem has_dedicated_table=true e tabela propria. Enoque detecta no activity_log que varias execucoes envolvem 'fallback para caminho alternativo' mas nao existe Concept formalizado — propoe novo Concept via self-improvement.
- **Non-example**: Uma direcao estrategica como 'sejamos 100% autonomos' (isso e Vision — e abstrata e nao verificavel num ponto unico do sistema). Um goal como 'implementar feature X ate sexta' (isso e task/demand). Uma preferencia de estilo como 'usar camelCase' (isso e convencao, nao mecanismo do sistema).

### Consensus Loop (`consensus_loop`)
Multi-round evaluation pattern where two agents (evaluator + challenger) reach consensus on a decision. Eliminates human bottleneck for critical autonomous decisions.
- **Expected result**: Critical decisions are validated by at least 2 agents before execution, eliminating human bottleneck.
- **Example**: Jaco evaluates an opportunity with 9 criteria, Abraao challenges weak points, they reach consensus in 2 rounds to approve implementation.
- **Non-example**: A single agent makes a critical decision alone without any validation or challenge.

### Demand Lifecycle (`demand_lifecycle`)
Demand status is BINARY based on PR outcome: completed (PR merged into main) or failed (no PR merged). Individual task outcomes do not determine demand status.
- **Expected result**: Demand status accurately reflects delivery outcome.
- **Example**: Demand has 5 tasks, 3 failed but final PR was merged → demand status = completed. Demand has all tasks done but PR was rejected → status = failed.
- **Non-example**: Demand marked as completed because all tasks finished, even though the PR was never merged.

### Derived Opportunities (`derived_opportunities`)
Mecanismo de feedback do consenso: durante a discussao Jaco-Abraao sobre uma oportunidade, insights genuinamente NOVOS podem surgir (gaps nao relacionados, melhorias adjacentes, necessidades de setor). Esses insights sao capturados como oportunidades derivadas (max 2 por consenso) e inseridos automaticamente na tabela opportunities com source=consensus_discussion e parent_opportunity_id. Cada derivada passa pelo mesmo ciclo de avaliacao Jaco-Abraao. Protecoes: sem recursao (derivadas nao geram novas derivadas), dedup semantico (threshold 0.85), rastreabilidade total via evidence e activity_log.
- **Expected result**: Insights valiosos que surgem durante discussoes de consenso NAO se perdem — sao capturados e avaliados formalmente, maximizando o valor de cada interacao entre agentes.
- **Example**: Durante avaliacao de oportunidade sobre melhoria de prompts, Abraao identifica que o setor de Marketing nao tem agente de SEO. Essa observacao gera oportunidade derivada tipo agent_creation, que entra no ciclo normal de avaliacao.
- **Non-example**: Abraao menciona um gap importante na discussao, mas a observacao morre no texto da discussion e nunca vira uma acao concreta.

### Extractors (`extractors`)
Componentes especializados em extração de dados da internet para alimentar o sistema. Extractors coletam dados de Channels para: análise de mercado, pesquisa de conteúdo, inteligência competitiva, benchmarks, tendências, e qualquer input externo necessário para decisões autônomas. Extractors podem operar standalone ou dentro de um Workflow. Novos Extractors podem ser propostos pelo self-improvement loop quando o sistema detecta necessidade de dados que não consegue acessar.
- **Expected result**: O sistema tem capacidade de buscar informação externa de forma estruturada e autônoma. Toda decisão tomada a partir de dados extraídos DEVE ser avaliada contra TODAS as visões ativas da ArqueOps — cada extração deve contribuir para pelo menos uma visão. Dados coletados ampliam a visão do sistema e alimentam o self-improvement loop, oportunidades de crescimento, e decisões de negócio baseadas em evidência real de mercado.
- **Example**: O setor Marketing precisa analisar concorrência. O Extractor de LinkedIn busca posts de empresas similares, o Extractor de YouTube analisa canais técnicos relevantes. Os dados coletados são avaliados contra as visões: contribui para Revenue Generation (identifica oportunidade de monetização), Growth Mindset (expande capacidade de mercado), ROI-Driven (evidência objetiva de demanda). Enoque propõe estratégia com base em evidência real.
- **Non-example**: Agentes operam apenas com dados internos (activity_log, tasks, demands). Nenhuma informação externa é coletada e o sistema toma decisões estratégicas no vácuo, sem contexto de mercado. Ou dados são extraídos mas usados sem avaliar alinhamento com as visões do sistema.

### Human Escalation (`human_escalation`)
Points where the system requires human intervention. Each escalation is a bottleneck against autonomy that should be analyzed and potentially eliminated via consensus loops.
- **Expected result**: Each escalation is tracked and analyzed as an autonomy bottleneck to be eliminated.
- **Example**: Moises exhausts retry limit → escalates to admin → activity_log records escalation type and reason → Enoque later analyzes if this could be automated.
- **Non-example**: Admin is pinged for help but no record is kept of why, making it impossible to prevent future escalations.

### On-Demand External Access (`on_demand_external_access`)
External data (Google Drive, YouTube, APIs) is accessed on-demand at execution time — never pre-fetched, synced, or cached speculatively. Agents access the source, process what they need, execute their task, and persist only work output (logs, results, code changes) or data explicitly requested. Source files/content are never stored.
- **Expected result**: No external data is duplicated in Supabase. Agents fetch what they need, when they need it.
- **Example**: Agent reads a Google Drive spreadsheet to update a script. Decrypts OAuth token → calls Drive API → reads spreadsheet → modifies script → commits → logs action. Spreadsheet content is not stored. Only the commit, log entry, and task result persist.
- **Non-example**: A sync job downloads Google Drive files into Supabase Storage and indexes metadata into a table. Agents then read from the local copy instead of the source.

### Opportunity Evaluation (`opportunity_evaluation`)
Avaliacao autonoma de oportunidades via consenso Jaco (Avaliador) + Abraao (Conselheiro Estrategico). Jaco avalia com criterios ponderados (viabilidade tecnica, redundancia, esforco vs impacto, over-engineering, causa raiz, alternativa simples, padrao historico, alinhamento com visoes, clareza). Thresholds: weighted >= 0.70 = implement, < 0.40 = reject, entre = escalate. Abraao desafia com perspectiva estrategica. Maximo 3 rounds de consenso. Toda discussao e registrada em opportunity_discussions e embedada para busca semantica futura.
- **Expected result**: Oportunidades sao avaliadas com rigor e multiplas perspectivas, resultando em alta taxa de sucesso das implementacoes e baixa taxa de retrabalho.
- **Example**: Jaco avalia oportunidade com 9 criterios, score ponderado 0.82. Abraao concorda nos pontos principais mas sugere abordagem mais simples. Jaco ajusta e consenso e atingido no round 2. Oportunidade aprovada.
- **Non-example**: Uma oportunidade e aprovada automaticamente sem nenhuma avaliacao ou desafio, resultando em implementacao de baixa qualidade.

### Opportunity Lifecycle (`opportunity_lifecycle`)
Ciclo de vida de oportunidades de melhoria do sistema. Enoque detecta oportunidades a cada 10 minutos analisando falhas, padroes de erro, gaps de visao e potencial de crescimento. Cada oportunidade tem tipo (optimization, new_feature, growth, concept_discovery, sector_creation, agent_creation, vision_progress, concept_expansion, revenue_opportunity), confianca, evidencia e plano de acao. Status flow: detected → analyzing → accepted/rejected/escalated → implemented. Oportunidades aceitas geram demands automaticamente. Oportunidades rejeitadas alimentam o historico para calibrar futuras deteccoes.
- **Expected result**: O sistema continuamente identifica e executa melhorias de forma autonoma, sem intervencao humana, criando um ciclo virtuoso de evolucao.
- **Example**: Enoque detecta que 15% das execucoes do agente X falham por timeout. Cria oportunidade tipo optimization com plano de acao para aumentar max_turns. Jaco-Abraao avaliam e aprovam. Demand criada automaticamente.
- **Non-example**: Um humano identifica manualmente um problema e cria uma demand diretamente, sem passar pelo ciclo de oportunidades.

### Orchestrator (`orchestrator`)
Central engine that manages the entire task lifecycle: queue processing, agent dispatching, health monitoring, and coordination between all system components.
- **Expected result**: All task scheduling, health checks, and lifecycle management handled centrally.
- **Example**: The orchestrator picks up a pending task, finds the best available agent via task-router, creates a worktree, dispatches execution, and monitors for completion or failure.
- **Non-example**: Tasks are executed ad-hoc without central coordination, leading to conflicts and resource contention.

### Performance Score (`performance_score`)
Exponential Moving Average (EMA, alpha=0.1) tracking agent performance: success=1, failure=0. Score naturally adjusts over time based on execution outcomes.
- **Expected result**: High-performing agents get more tasks; struggling agents get fewer.
- **Example**: Agent with 0.95 EMA gets priority for complex tasks. Agent with 0.45 EMA gets simpler tasks and more context injection.
- **Non-example**: All agents are treated equally regardless of their track record or domain expertise.

### Setores/Departamentos (`sectors`)
Agentes organizados em unidades de negocio (setores) com missao clara, KPIs e operacao semi-autonoma. Cada setor e responsavel por uma area funcional da empresa e pode propor criacao de novos agentes e sub-setores.
- **Expected result**: Agentes agrupados em setores com missao e KPIs claros. Enoque detecta gaps organizacionais e propoe novos setores. Cada setor contribui para as visoes estrategicas.
- **Example**: Setor AR (Agentic Resources) detecta que o agente recem-criado para marketing precisa de onboarding. O setor tem um workflow de avaliacao que valida as capabilities do novo agente antes de ativa-lo em producao.
- **Non-example**: Agentes existem sem qualquer agrupamento organizacional. Ou setores sao apenas tags cosmeticas sem impacto na operacao, sem KPIs, sem missao.

### Self-Improvement Loop (`self_improvement_loop`)
Autonomous opportunity detection cycle: Enoque analyzes patterns → proposes opportunities → Jaco-Abraao evaluate via consensus → approved opportunities become demands.
- **Expected result**: System continuously identifies and implements its own improvements.
- **Example**: Enoque detects 5 consecutive human escalations for the same error type → proposes automation opportunity → Jaco-Abraao approve → demand created → system now handles it autonomously.
- **Non-example**: System improvements only happen when a human notices a problem and manually creates a demand.

### Semantic Analysis (`semantic_analysis`)
Busca vetorial baseada em embeddings que fornece enriquecimento de contexto: tarefas similares, decisoes passadas, lessons learned, conhecimento cross-project. REGRA CRITICA: agentes DEVEM SEMPRE usar busca semantica como metodo PRIMARIO de pesquisa em qualquer operacao de lookup, pesquisa ou enriquecimento de contexto. Busca semantica otimiza recursos (menor custo computacional que LLM re-processando texto) e fornece o MELHOR contexto possivel por usar proximidade de significado ao inves de match exato. ILIKE e fallback APENAS quando busca vetorial retorna zero resultados.
- **Expected result**: Todo agente usa searchSimilar() como primeiro recurso antes de qualquer decisao que dependa de contexto historico. Nenhuma pesquisa e feita por ILIKE sem antes tentar busca vetorial. Todas as tabelas com conteudo textual relevante possuem embeddings gerados e indexados. O sistema gasta menos tokens de LLM porque o contexto fornecido pela busca semantica e precisamente relevante.
- **Example**: Antes de executar uma task de migracao, o agente faz searchSimilar("tasks", descricao) e recebe 3 migracoes similares com outcomes e lessons learned. Task router faz searchSimilar("departments", demand_content) para rotear demanda ao departamento correto. Enoque faz searchSimilar("activity_log", "falha recorrente") para detectar padroes de problema. Agente busca searchSimilar("agent_memory", contexto) antes de cada execucao.
- **Non-example**: Agente faz SELECT * FROM tasks WHERE title ILIKE '%migration%' ao inves de busca semantica. Ou agente inicia execucao sem consultar contexto historico. Ou tabelas com conteudo textual importante nao possuem embeddings (coluna embedding NULL). Ou busca semantica existe mas agentes preferem queries SQL diretas por habito.

### Task Router (`task_router`)
Agent-task matching system based on domain expertise, performance scores (EMA), availability, and historical success patterns.
- **Expected result**: Best available agent assigned to each task based on data, not random.
- **Example**: Task-router selects Aoliabe for a UI task because she has 0.92 performance score in frontend domain and is currently available.
- **Non-example**: Tasks are assigned round-robin or to the first available agent regardless of their expertise or track record.

### Vision (`vision`)
Diretriz estrategica de longo prazo que define PARA ONDE o sistema deve caminhar. Uma Vision e ABSTRATA — nao e verificavel por evidencia concreta num unico ponto do sistema (tabela, codigo, worker). Uma Vision NAO e um goal (goals sao atingiveis e terminam) — e uma direcao continua que sempre pode ser aprofundada. Visions englobam multiplos Concepts (formalizados ou ainda nao) que materializam partes da direcao estrategica. Visions sao definidas EXCLUSIVAMENTE por humanos — agentes NAO podem criar, alterar ou remover Visions. Visions sao injetadas no contexto de TODOS os agentes e servem como criterio de priorizacao para oportunidades, demands e decisoes de consenso. O conjunto de Visions ativas define a identidade estrategica do sistema e e a fonte primaria de descoberta de novos Concepts.
- **Expected result**: Nenhuma decisao autonoma e tomada sem avaliar alinhamento com as Visions ativas. Oportunidades que avancam multiplas Visions tem prioridade. Conflitos entre Visions sao resolvidos via consensus loop. Agentes identificam Concepts embutidos nas Visions que ainda nao foram formalizados e propoem sua criacao via self-improvement.
- **Example**: V1 (Autonomia 100%): toda vez que um agente considera escalar para humano, avalia se existe alternativa autonoma primeiro. V9 (Expansao por Setores): engloba conceitos como Setores/Departamentos (ja formalizado, tem tabela propria) e outros ainda nao extraidos como estrutura organizacional, KPIs por setor, onboarding de agentes. Enoque le a Vision, identifica conceitos mencionados que nao existem como system_concepts, e propoe formalizacao.
- **Non-example**: Um goal como 'migrar o banco ate sexta' (isso e task/demand — tem prazo e termina). Uma regra tecnica como 'usar snake_case no DB' (isso e convencao de codigo, nao direcao estrategica). Um KPI isolado como 'uptime 99.9%' (isso e metrica, nao visao). Um mecanismo concreto verificavel como 'consensus loop' ou 'task router' (isso e Concept, nao Vision — e verificavel por evidencia no codigo).

### Worker (`worker`)
Unidade atomica de execucao do sistema. Sequencia de ACOES concretas e executaveis que transforma um input definido em um output definido. Todo worker e autocontido (depende apenas do input), reutilizavel (qualquer workflow pode chama-lo) e rastreavel (cada execucao e registrada). Um worker executa do inicio ao fim sem delegar para outros workers — se precisa chamar outro worker, isso e um workflow. Workers podem ser periodicos (cron) ou sob-demanda (chamados por workflows).
- **Expected result**: Toda acao repetivel do sistema e encapsulada num worker com input/output claros, eliminando codigo duplicado e permitindo composicao em workflows.
- **Example**: self-improvement-worker: input=metricas 24h, acoes=analisa falhas+detecta padroes+gera proposals, output=oportunidades detectadas. agent-file-sync: input=agentes do DB, acoes=compara com .md files+atualiza frontmatter, output=qtd files alterados. runConsensusLoop: input=config com evaluator+challenger+prompts, acoes=rounds de avaliacao+discussao+consenso, output=decisao+derivedOpportunities.
- **Non-example**: Uma etapa abstrata como 'fase de planejamento' (isso e etapa de workflow). Um fluxo completo com decisoes de roteamento como 'demand chega→interpreta→planeja→executa' (isso e workflow). Um processo que chama outros workers (isso e workflow, nao worker). Uma configuracao estatica (isso e conceito ou schema).

### Workflow (`workflow`)
Fluxo dirigido que compoe Workers, outros Workflows, pontos de decisao e roteamento para cumprir um objetivo de negocio. Um Workflow define a SEQUENCIA e as CONDICOES sob as quais Workers e sub-Workflows sao invocados, qual agente cuida de cada etapa, e como o output de um passo alimenta o proximo. Workflows tem entry points (triggers), branching (decisoes de roteamento) e end states (completed/failed). Se existe um fluxograma com losangos (decisoes) e retangulos (acoes/workers/sub-workflows), isso e um Workflow.
- **Expected result**: Todo processo de negocio e modelado como um Workflow com etapas, roteamento e entry/exit claros. Novos processos sao compostos a partir de Workers e Workflows existentes, sem reinventar logica.
- **Example**: Demand lifecycle: trigger=mensagem Telegram → Moises (route) → Daniel (interpret, decisao: claro ou ambiguo?) → Josue (plan tasks) → para cada task: Executor (code) → Jeremias (review, decisao: score>=0.8?) → se sim: auto-merge, se nao: re-delegation. Opportunity lifecycle: trigger=Enoque detecta oportunidade → Jaco-Abraao (consensus loop) → decisao: approved? → se sim: invoca Demand lifecycle (sub-workflow) para implementar.
- **Non-example**: Um worker isolado como agent-file-sync (sem routing/decisao, e execucao atomica — isso e Worker). Uma configuracao estatica como evaluation_criteria (isso e conceito/schema). Uma lista de agentes disponiveis (isso e dado, nao fluxo).

## SYSTEM VISIONS
Strategic directions that guide ALL autonomous decisions. Every decision must be evaluated against these visions.

### DNA Organizacional — Concepts e Visions são Invioláveis (priority: 1)
Os System Concepts e System Visions são o DNA da ArqueOps. Toda decisão autônoma DEVE ser avaliada contra os Concepts (como o sistema opera) e as Visions (para onde o sistema vai). Agentes não podem tomar decisões que contradigam Concepts ou Visions. Quando há conflito entre uma tarefa solicitada e um Concept/Vision, o Concept/Vision prevalece. O sistema deve evoluir os Concepts e Visions, nunca ignorá-los.
- **Example**: Ao decidir se faz auto-merge de um PR, o agente consulta o Concept "Auto Merge" e verifica se TODAS as condições estão atendidas. Ao planejar uma feature, consulta as Visions para garantir alinhamento estratégico.
- **Non-example**: Um agente ignora o Concept de "Human Escalation" e pergunta ao admin algo que deveria resolver autonomamente. Ou um agente toma uma decisão estratégica sem consultar as Visions ativas.

### Autonomia 100% (priority: 2)
The system should operate as close to 100% autonomy as possible. The human role is limited to: sending demands and reviewing/merging PRs. Every other decision should be handled autonomously via consensus loops, performance scores, and self-improvement cycles.
- **Example**: System detects a recurring failure pattern, proposes a fix via self-improvement loop, Jaco-Abraao reach consensus to approve, demand is created and executed, PR is auto-merged — zero human involvement.
- **Non-example**: An agent fails a task and the system immediately pings the admin for help instead of attempting retry, reassignment, or creating a fix-task autonomously.

### Rastreabilidade Total (priority: 3)
Everything that happens in the system must be logged in activity_log with sufficient metadata for semantic learning. No invisible actions. Every decision, escalation, retry, and outcome generates a record that can be embedded and searched.
- **Example**: Moises decides to retry a task with a different agent → activity_log records: action, old_agent, new_agent, reason, demand_id, task_id — all searchable via embeddings.
- **Non-example**: An agent is reassigned to a task but no record is kept of who was the previous agent or why the reassignment happened.

### Qualidade Autonoma (priority: 4)
Quality is ensured through automated systems: acceptance criteria define "done", consensus loops validate decisions, performance scores guide agent selection, and auto-merge handles delivery. Human code review is the last resort, not the first checkpoint.
- **Example**: PR has 8 acceptance criteria, Jeremias validates all 8, review score is 0.91, CI passes → auto-merged. Human never needs to look at the code.
- **Non-example**: Every PR requires manual human review regardless of automated quality checks, creating a bottleneck that blocks autonomous delivery.

### Resiliência Operacional (priority: 5)
O sistema deve ser resiliente a falhas de ferramentas, recursos e infraestrutura. Quando um caminho de execucao falha, agentes DEVEM encontrar caminhos alternativos antes de escalar para humano. Falha de ferramenta nao e falha da tarefa. O sistema absorve instabilidades operacionais sem interromper o fluxo de valor.
- **Example**: Bash tool trava por worktree extinto → agente spawna subagent com shell limpo e conclui a tarefa. API externa retorna rate limit → retry com backoff progressivo. Worktree nao pode ser criado → agente trabalha em branch direto no repo principal.
- **Non-example**: Agente encontra erro de ferramenta e imediatamente escala para humano pedindo que rode o comando manualmente. Ou agente tenta o mesmo caminho repetidamente sem buscar alternativa. Ou sistema para completamente porque um servico externo esta temporariamente fora.

### Colaboração Autônoma do Time (priority: 6)
O time de agentes SEMPRE colabora entre si para completar qualquer tarefa. Se uma tarefa exige competência que o agente atual não tem, ele DEVE identificar qual agente especialista existe e delegar. Se nenhum agente especialista existe para a competência necessária, o sistema DEVE acionar o worker de criação de agentes para construir um novo agente antes de prosseguir. Nenhum agente trabalha isolado — o sistema opera como um organismo onde cada parte busca e ativa as outras partes quando necessário.
- **Example**: Bezalel precisa de testes para um componente. Ele identifica que Natã é o especialista em unit tests e delega. Se precisasse de testes de acessibilidade e não existisse agente para isso, o worker create-agent seria acionado para criar o agente antes de prosseguir.
- **Non-example**: Um agente tenta fazer tudo sozinho mesmo quando existe outro agente especializado. Ou o sistema falha uma tarefa porque "não tem agente para isso" ao invés de criar um.

### Execução Orientada por ROI (priority: 7)
Toda decisão de execução no sistema (demands, opportunities, tasks, criação de setores, criação de agentes) DEVE ser avaliada pelo retorno que gera. O ROI tem duas dimensões: ROI de receita (valor monetário direto — serviços, produtos, monetização) e ROI de equity (ganho real e objetivo — poupar tempo, gerar valor mensurável, criar ativos que aumentam a capacidade produtiva ou competitiva). Nenhuma execução acontece "porque seria legal" — deve haver justificativa objetiva com evidência de valor. O ideal é que a execução tenha ROI positivo em ambas dimensões, mas ter pelo menos uma já é suficiente. Subjetividade não é aceita — todo ROI deve ser mensurável e fundamentado em dados.
- **Example**: Consensus loop avalia proposta de novo setor YouTube. Jacó calcula: custo = 3 agentes + 5 demands de setup. ROI de receita = monetização do canal estimada em R$X/mês. ROI de equity = conteúdo técnico que posiciona ArqueOps como referência + automações reutilizáveis criadas no processo. Ambos positivos com evidência → aprovado. Ou: proposta de automação interna sem receita direta, mas ROI de equity claro = poupa 20h/mês de execução manual → aprovado com evidência objetiva.
- **Non-example**: Agente propõe "seria legal ter essa automação" sem quantificar o ganho. Ou sistema cria 10 agentes e 3 setores sem calcular se o investimento de execução gerou retorno real. Ou oportunidade é aprovada no consensus loop com justificativa subjetiva como "melhora a experiência" sem dados de impacto.

### Mentalidade de Crescimento (priority: 8)
O sistema DEVE operar com viés de crescimento, não apenas manutenção. Para cada ciclo de análise do self-improvement loop, pelo menos 50% das propostas devem ser orientadas a crescimento — novos setores, novos agentes, novas capacidades, novos mercados, novos canais. A inércia operacional (apenas corrigir bugs e otimizar processos) é o inimigo. Crescimento significa: expandir capacidades, alcançar novos mercados, criar novos ativos, e aumentar a superfície de valor da ArqueOps. Todos os agentes, não apenas Enoque, devem considerar crescimento ao tomar decisões.
- **Example**: Enoque roda um ciclo de análise e propõe: 1 fix de bug recorrente + 3 propostas de crescimento (criar setor Marketing, desenvolver API pública para clientes, registrar novo channel YouTube para extração de tendências). O sistema prioriza as propostas de crescimento sobre otimizações incrementais.
- **Non-example**: 10 ciclos consecutivos do self-improvement loop geram apenas propostas de "optimization" — refatorações, fixes de erros, ajustes de performance. Nenhuma proposta expande as capacidades do sistema ou abre novos caminhos de valor. O sistema está tecnicamente estável mas estrategicamente estagnado.

### Geracao de Receita Autonoma (priority: 9)
ArqueOps deve evoluir para gerar receita de forma autonoma como empresa. O sistema deve detectar oportunidades de mercado, propor servicos, criar unidades de negocio, e medir o impacto financeiro das operacoes autonomas. Cada setor deve ter KPIs financeiros claros e contribuir para a sustentabilidade economica da empresa.
- **Example**: Enoque detecta que ArqueOps tem capacidade de criar conteudo tecnico de alta qualidade. Propoe criacao do setor YouTube com agentes especializados em roteiro, gravacao de prompts, SEO. Jaco/Abraao avaliam e aprovam. Setor e criado autonomamente. Em 3 meses, canal gera receita via monetizacao.
- **Non-example**: Sistema apenas otimiza processos internos sem nunca considerar como gerar valor economico externo. Ou sistema cria servicos sem medir retorno financeiro.

### Expansao por Setores (priority: 10)
O sistema organiza agentes em setores/departamentos de negocio que operam semi-autonomamente. Cada setor tem missao clara, KPIs, e pode propor criacao de novos agentes. O sistema deve identificar gaps organizacionais e criar novos setores autonomamente quando detectar oportunidades. Setores incluem: TI, Estrategia, AR (Agentic Resources), Marketing, Vendas, Financeiro, etc.
- **Example**: Enoque detecta que nenhum agente trata de marketing. Propoe criacao do setor Marketing com agentes para social media, SEO e copywriting. Consensus loop aprova. Eliseu cria os agentes. Setor comeca a operar com KPIs de leads gerados e engagement.
- **Non-example**: Todos os 50 agentes operam num pool flat sem estrutura organizacional. Ou setores existem apenas como labels sem missao, KPIs ou autonomia operacional.

## Workers (30 active)
Atomic execution units. Each Worker has input→actions→output. Workers do NOT call other Workers.

- `agent-db-inserter`: Insersor de Agente no Banco — Insere o agente criado nas tabelas agents e agent_documentation, atribui ao departamento, loga no activity_log e notific
- `agent-file-sync`: Agent File Sync — Syncs agent definitions from DB to .md files every hour
- `agent-prompt-generator`: Gerador de System Prompt — Gera o system_prompt do agente combinando expertise real dos especialistas pesquisados com archetype, temperament e refe
- `branch-cleanup`: Branch Cleanup — Cleans up stale remote branches from merged/closed PRs across all projects
- `brand-md-generator`: Gerador de Brand.md — Gera o documento Brand.md (design system) via questionario interativo ou extracao de manual de marca. Coleta: nome, core
- `client-registration`: Cadastro de Cliente — Cadastra um novo cliente no sistema com nome, email, empresa. Cria colaborador principal automaticamente.
- `content-create`: Criacao de Conteudo — Produz o conteudo final com base no outline aprovado: texto, titulos SEO, meta-descricao e elementos visuais necessarios
- `content-measure`: Medicao de Performance de Conteudo — Coleta e analisa metricas de performance do conteudo publicado: alcance, engajamento, leads gerados e contribuicao para 
- `content-outline`: Estruturacao de Conteudo — Estrutura o conteudo definindo hierarquia de topicos, pontos-chave, chamadas para acao e formato final (artigo, thread, 
- `content-publish`: Publicacao de Conteudo — Publica o conteudo nos canais de destino configurados (blog, LinkedIn, Twitter/X, newsletter) com agendamento e rastream
- `content-research`: Pesquisa de Conteudo — Pesquisa topicos relevantes, tendencias de mercado e necessidades do publico-alvo para embasar a criacao de conteudo.
- `cross-project-analysis`: Cross-Project Analysis — Analyzes patterns and metrics across all active projects to surface opportunities and risks.
- `embedding-backlog`: Embedding Backlog Processor — Batch-embeds rows with NULL embedding columns across all tables every 5 minutes
- `expert-content-collector`: Coletor de Conteudo de Especialistas — Para cada um dos 3 especialistas descobertos, coleta e analisa ~1 ano de conteudo real (artigos, talks, videos, livros).
- `expert-discovery`: Descoberta de Especialistas — Pesquisa na internet os 3 melhores especialistas ativos em um dominio especifico. Retorna perfil detalhado com canais de
- `expert-pattern-analyzer`: Analisador de Padroes Cruzados — Cruza o conteudo dos 3 especialistas para encontrar padroes em comum, melhores praticas consensuais, anti-patterns, e di
- `health-check`: Health Check Worker — Runs every 5 minutes. Detects and auto-fixes pipeline issues: stuck demands (>15min), zombie tasks (>45min), stuck execu
- `health-digest`: Health Digest Worker — Generates periodic health digests summarizing system status, error patterns, and operational metrics.
- `input-md-generator`: Gerador de Input.md — Gera o documento Input.md (escopo tecnico) a partir de descricao em linguagem natural do projeto. Campos obrigatorios: N
- `opportunity-evaluator`: Opportunity Evaluator — Evaluates detected opportunities via consensus discussion and decides accept/reject
- `opportunity-verification`: Opportunity Verification Worker — Verifies whether a proposed opportunity is real by checking it against the 5 DNA pillars (Visions, Concepts, Workers, Wo
- `plan-documentation`: Documentacao de Plano — Documenta planos em formato padronizado e persistente para sobreviver compactacoes de sessao.
- `pr-github-reconciliation`: PR-GitHub Reconciliation — Reconciles PR state between GitHub API and database to catch webhook misses every hour
- `prd-generator`: Gerador de PRD — Gera PRD (Product Requirements Document) estruturado com pontos de decisao [DECISAO] interativos. Requer Input.md e Bran
- `project-github-sync`: Project GitHub Sync — Syncs GitHub events (PRs, issues, commits) to project_events for multi-project monitoring.
- `project-registration`: Cadastro de Projeto — Registra projetos existentes e vincula a clientes. Aceita params estruturados ou extrai de demand_content via agente.
- `self-improvement`: Self-Improvement Loop — Enoque analyses recent failures and proposes system improvements every 10 minutes
- `system-context-sync`: System Context File Sync — Syncs system concepts and visions from DB to .claude/system-context.md every hour
- `todoist-cleanup`: Todoist Stale Task Cleanup — Closes Todoist tasks linked to terminal entities every hour
- `worker-builder`: Construtor de Workers — Cria novos workers automaticamente quando se identifica necessidade de um processo operacional repetitivo.

## Workflows (3 active)
Compositions of Workers AND other Workflows with routing and decisions.

- `agent-construction`: Construcao de Agente Especializado — Fluxo completo de criacao de agente com expertise real: pesquisa 3 especialistas do dominio, coleta 1 ano de conteudo, a
- `marketing-content-pipeline`: Pipeline de Conteudo Marketing — Fluxo completo de criacao de conteudo para o setor Marketing: pesquisa de topicos e tendencias (research), estruturacao 
- `new-project-construction`: Construcao de Novo Projeto — Fluxo completo para construcao de um novo projeto: cadastro do cliente (se necessario), geracao de Input.md (escopo), Br

## Activity Log Actions Reference
Actions mapped to concepts for automatic tagging in activity_log.

- **Acceptance Criteria** (`acceptance_criteria`): `acceptance_criteria_generated`, `acceptance_criteria_validated`, `acceptance_criteria_all_passed`, `acceptance_criteria_partial`
- **Agent Memory** (`agent_memory`): `agent_memory_stored`, `agent_memory_retrieved`, `agent_memory_decayed`
- **Asset Ownership** (`asset_ownership`): `asset_ownership_assigned`, `asset_ownership_transferred`, `asset_owner_routed`
- **Auto Merge** (`auto_merge`): `auto_merge_executed`, `auto_merge_skipped`, `auto_merge_criteria_missing`
- **Channels** (`channels`): `channel_registered`, `channel_accessed`, `channel_deactivated`, `channel_proposed`
- **Concept** (`concept`): `concept_created`, `concept_updated`, `concept_discovered`
- **Consensus Loop** (`consensus_loop`): `consensus_started`, `consensus_round_completed`, `consensus_approved`, `consensus_rejected`, `consensus_escalated`, `consensus_needs_correction`
- **Demand Lifecycle** (`demand_lifecycle`): `demand_status_changed`, `demand_auto_completed`, `demand_auto_failed`
- **Derived Opportunities** (`derived_opportunities`): `derived_opportunity_created`
- **Extractors** (`extractors`): `extraction_started`, `extraction_completed`, `extraction_failed`, `extraction_data_processed`
- **Human Escalation** (`human_escalation`): `human_escalation_required`, `human_escalation_resolved`, `moises_decision_human_intervention`
- **On-Demand External Access** (`on_demand_external_access`): `external_data_accessed`, `external_data_processed`
- **Opportunity Evaluation** (`opportunity_evaluation`): `opportunity_evaluation_started`, `opportunity_consensus_round`, `opportunity_auto_accepted`, `opportunity_auto_rejected`
- **Opportunity Lifecycle** (`opportunity_lifecycle`): `self_improvement_opportunity_proposed`, `opportunity_auto_accepted`, `opportunity_auto_rejected`, `opportunity_escalated`
- **Orchestrator** (`orchestrator`): `orchestrator_started`, `orchestrator_cycle`, `orchestrator_health_check`, `orchestrator_shutdown`
- **Performance Score** (`performance_score`): `performance_updated`, `performance_threshold_low`, `performance_threshold_high`
- **Setores/Departamentos** (`sectors`): `sector_created`, `sector_updated`, `agent_assigned_to_sector`, `sector_kpi_measured`
- **Self-Improvement Loop** (`self_improvement_loop`): `self_improvement_analysis`, `self_improvement_opportunity_proposed`, `self_improvement_opportunity_approved`, `self_improvement_opportunity_rejected`, `recurring_error_pattern`
- **Semantic Analysis** (`semantic_analysis`): `embedding_created`, `embedding_backfilled`, `vector_search_performed`, `context_enriched`
- **Task Router** (`task_router`): `task_routed`, `task_router_no_agent`, `task_router_fallback`
- **Vision** (`vision`): `vision_created`, `vision_updated`, `vision_deactivated`
- **Worker** (`worker`): `worker_started`, `worker_completed`, `worker_failed`, `worker_skipped`
- **Workflow** (`workflow`): `demand_created`, `demand_interpreted`, `demand_planned`, `demand_completed`, `demand_failed`

## Evaluation Criteria
Used in consensus loops to evaluate opportunities and task definitions.

### Definition Clarity (`definition_clarity`)
Measures how well-defined the work is: unambiguous scope, testable acceptance criteria with yes/no answers, and enough detail for an agent to execute without asking clarifying questions.
- **Question**: Is the scope unambiguous? Are acceptance criteria testable with a yes/no answer? Can an agent execute without asking clarifying questions?

### Effort vs Impact (`effort_vs_impact`)
Measures the ROI of the proposed change: is the development effort proportional to the value delivered? Flags changes that require multiple tasks for minimal benefit.
- **Question**: Is the development effort proportional to the value delivered? Would this take >2 tasks for minimal benefit?

### Overengineering Risk (`overengineering_risk`)
Flags premature optimization: unnecessary abstractions, excessive configuration, or flexibility designed for hypothetical future needs rather than current requirements.
- **Question**: Does this add unnecessary abstraction, configuration, or flexibility for hypothetical future needs?

### Past Pattern Alignment (`past_pattern_alignment`)
Uses evidence from historical data (via vector search) to check whether similar past decisions succeeded or failed. Data-driven decision validation.
- **Question**: Do similar past decisions (from vector search) show this approach succeeds or fails?

### Redundancy Check (`redundancy_check`)
Verifies that the proposed change does not duplicate functionality already present in the codebase, database schema, or agent capabilities. Checked by searching existing code and DB schema for overlap.
- **Question**: Does this duplicate functionality that already exists in the codebase, database, or agent capabilities?

### Root Cause Analysis (`root_cause_analysis`)
Ensures the proposed change addresses the underlying cause of a problem rather than patching a symptom. Lasting solutions over quick fixes.
- **Question**: Does this address the underlying cause of the problem, or just patch a symptom?

### Simpler Alternative (`simpler_alternative`)
Verifies minimality: could the same result be achieved with fewer files, less code, or by leveraging an existing pattern in the codebase?
- **Question**: Could the same result be achieved with fewer files, less code, or an existing pattern?

### Task Scope Atomicity (`task_scope_atomicity`)
Verifies that each task has a focused, achievable scope. Test tasks must cover exactly one module/component/endpoint. Code tasks must be atomic. Broad tasks that bundle multiple unrelated concerns should be split.
- **Question**: Is this task focused on a single module, component, endpoint, or use case? For test tasks: does it test exactly ONE thing (not multiple components/endpoints bundled together)? Could an agent complete this within its max_turns budget?

### Technical Viability (`technical_viability`)
Evaluates whether the proposed change can be implemented with the current tech stack (Next.js 16, Supabase, Node.js orchestrator) without requiring new infrastructure, services, or major architectural changes.
- **Question**: Can this be implemented with the current tech stack (Next.js 16, Supabase, Node.js orchestrator) without new infrastructure?

### Vision Alignment (`vision_alignment`)
Evaluates whether the proposed change moves the system closer to its active visions (e.g., Autonomia 100%). Specifically checks if it reduces or increases human dependency.
- **Question**: Does this move the system closer to its active visions (e.g., Autonomia 100%)? Does it reduce or increase human dependency?

## DB Schema (main tables)
Use semantic search on `activity_log` to understand patterns. Key tables:

- `agents` — 52 specialized agents with system_prompt, performance_score, model, max_turns
- `tasks` — Work units with type, status, acceptance_criteria, assigned agent
- `demands` — Client/system requests that spawn tasks
- `opportunities` — Detected improvements (Enoque) evaluated via consensus (Jaco/Abraao)
- `activity_log` — Every system action with metadata and concept tagging
- `agent_executions` — Execution records with status, error_message, duration
- `pr_reviews` — Code review results with scores and acceptance criteria validation
- `consensus_loops` — Multi-round evaluation records with criteria scores
- `consensus_discussions` — Individual agent arguments per consensus round
- `agent_memory` — Cross-project learnings (error patterns, success patterns)
- `system_concepts` — DNA pillar: formal concept definitions
- `system_visions` — DNA pillar: strategic directions
- `workers` — DNA pillar: registered atomic execution units
- `workflows` — DNA pillar: registered business process compositions
- `evaluation_criteria` — DNA pillar: quality standards for consensus
- `projects` — Multi-project support with default_branch, local_path
- `clients` — Client records linked to projects and demands
- `credentials` — Encrypted service credentials (tokens, keys)
- `integrations` — OAuth integrations (Google, LinkedIn, WhatsApp)
