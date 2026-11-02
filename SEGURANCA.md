# Segurança — relatório técnico

Auditoria e reforço de segurança feitos em 01/11/2026. Segurança é um processo contínuo: este documento diz o que
foi verificado, o que foi corrigido, como foi testado e o que **ainda depende de configuração ou continua como risco**.
Nada aqui significa que o sistema esteja "100% seguro".

## 1. Arquitetura (o que foi analisado)

| Camada | Tecnologia | Observação de segurança |
|---|---|---|
| Frontend | React 19 + Vite 8 + TypeScript, servido como arquivos estáticos pela Vercel | Não é confiável: toda regra de acesso está no banco |
| "Backend" | Supabase: Auth (GoTrue), API REST (PostgREST), Postgres 15+; uma função serverless na Vercel ([api/ai-endurance.ts](api/ai-endurance.ts)) | A função só existe para guardar a chave da AI Endurance (a antiga função do Strava foi removida) |
| Autorização | Row Level Security em **todas** as tabelas + permissões por coluna | Política "só o dono" (`auth.uid() = user_id`) |
| Integridade entre tabelas | Chaves estrangeiras compostas `(id, user_id)` | Impedem ligar um registro a dado de outra conta |
| Funções no banco | `security invoker` (respeitam RLS) ou `security definer` com `search_path` fixo | Nenhum SQL dinâmico com dado do usuário |
| E-mail | pg_cron + pg_net → Resend; chave no Supabase Vault | Única saída de rede do banco, para URL fixa |
| Integração externa | ExerciseDB (GIFs e instruções), chamada pelo navegador, sem chave | Só recebe o termo/id pesquisado |
| Integração externa | AI Endurance Partner API, **só pelo servidor** (função da Vercel), opcional | Chave de parceiro em variável de ambiente; o navegador nunca a vê |
| Arquivos | Importação .fit/.tcx/.gpx/.csv/.zip lida **no navegador**; nada é enviado como arquivo | Sem upload para servidor |
| Segredos | `.env.local` (fora do git) com URL e chave **pública** do Supabase | A chave pública é feita para ficar no navegador |

## 2. Vulnerabilidades encontradas e situação

| # | Achado | Risco | Situação |
|---|---|---|---|
| A1 | **Cadastro público aberto** (`disable_signup: false`, conferido no endpoint público do projeto): qualquer pessoa cria conta pela API mesmo sem tela de cadastro | **Alta** | **Corrigido no banco** (lista de e-mails autorizados) + fechar no painel (seção 6) |
| A2 | **Lembrete como canal de spam/phishing**: destinatário e link do botão "Abrir o app" livres; teste a cada 1 min sem teto diário (~1.400 e-mails/dia por conta) | **Alta** | **Corrigido**: link só para o endereço oficial do app, https, teste 1/min e 5/dia |
| M1 | Sem cabeçalhos de segurança (CSP, anti-clickjacking, HSTS…) e com script embutido no HTML | Média | **Corrigido** em `vercel.json`; script do tema virou arquivo |
| M2 | Campos de texto/JSON sem limite de tamanho (abuso de armazenamento, payloads enormes) | Média | **Corrigido**: limites em todo texto, JSON e lista |
| M3 | Papel anônimo podia **executar** funções do schema `public` (privilégio padrão `PUBLIC` do Postgres) | Média | **Corrigido**: execução só para `authenticated`, função por função |
| M4 | Sem trilha de auditoria de exclusões e alterações sensíveis | Média | **Corrigido**: `privado.auditoria` (só identificadores) |
| M5 | LGPD: sem exportação completa nem exclusão da conta pelo titular | Média | **Corrigido**: "Meus dados e privacidade" no menu |
| M6 | Credenciais do Strava (Client Secret, access e refresh token) foram coladas em conversa e gravadas em `.env.local` | Média | **Removidas do projeto; precisam ser revogadas** (seção 6) |
| M7 | Sessão do Supabase guardada em `localStorage` (padrão de SPA) — um XSS poderia lê-la | Média | **Mitigado** pela CSP; risco residual (seção 5) |
| B1 | Exportação CSV sujeita a injeção de fórmula (`=HYPERLINK(...)` vira fórmula no Excel) | Baixa | **Corrigido** |
| B2 | Importação de .zip/.gz sem limite (zip bomb trava o navegador) | Baixa | **Corrigido** (limites antes de descompactar) |
| B3 | ExerciseDB: sem tempo limite, respostas sem validação, id vindo do banco/navegador usado para montar URL | Baixa | **Corrigido** |
| B4 | Erro do teste de lembrete revelava detalhe de infraestrutura (Vault, nome do segredo) | Baixa | **Corrigido** (mensagem genérica; detalhe só no log do banco) |

Verificado e **sem problema**: RLS em todas as tabelas; anon sem acesso a tabelas; views com `security_invoker`;
funções `security definer` com `search_path` fixo; nenhum SQL dinâmico com entrada do usuário; nenhum
`dangerouslySetInnerHTML`, `innerHTML` ou `eval`; React escapa todo texto; sem `console.log` de dados sensíveis;
`npm audit` sem vulnerabilidades; `.env*` fora do git; bundle sem chave `service_role` ou outros segredos; login com
mensagem que não revela se o e-mail existe; "Sair" invalida a sessão no servidor (escopo global do Supabase).

## 3. O que foi implementado

### Banco — [supabase/migrations/20261101150000_seguranca.sql](supabase/migrations/20261101150000_seguranca.sql)

1. **Acesso anônimo zerado**: sem permissão em tabelas, sequências e funções do `public` (inclusive as futuras,
   via `alter default privileges`). Funções usadas pelo app liberadas uma a uma para `authenticated`.
2. **Cadastro só para e-mails autorizados**: gatilho em `auth.users` recusa e-mail fora de
   `privado.cadastro_permitido`. Quem já tinha conta foi incluído automaticamente. Vale mesmo que o cadastro esteja
   aberto no painel. Se o projeto não permitir gatilho em `auth`, a migração avisa e segue (feche pelo painel).
3. **Lembrete por e-mail**: o link do botão só fica se for igual ao endereço oficial (`privado.configuracao`,
   chave `app_url`, preenchida com o link já salvo pelo dono); https obrigatório; e-mail normalizado; teste limitado
   a 1 por minuto e 5 por dia (`privado.envios_lembrete`); erro de configuração não é repassado ao usuário.
4. **Limites de tamanho** (`not valid`: valem para o que for gravado daqui em diante): texto até 300 caracteres
   (observações, descrições e código de pagamento até 2.000; e-mail até 254), JSON até 64 KB (rotina de força até
   256 KB), listas até 20 itens.
5. **Auditoria** (`privado.auditoria`, fora da API): toda exclusão nas tabelas do usuário, mudanças no lembrete, no
   perfil e na rotina ativa, e exclusões de conta. Guarda só quem, de quem, tabela, operação e id — nenhum conteúdo.
   Retenção: 1 ano (envios de teste: 90 dias), limpeza diária pelo pg_cron.
6. **Exclusão da conta** (`public.excluir_minha_conta()`): apaga `auth.users` do próprio usuário e, em cascata,
   todos os dados; registra na auditoria e tira o e-mail da lista de cadastro.

### Frontend e publicação

| Arquivo | Mudança |
|---|---|
| [vercel.json](vercel.json) | CSP (`script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, conexões só para Supabase e ExerciseDB, imagens só da ExerciseDB), X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy, COOP/CORP |
| [index.html](index.html), [public/tema.js](public/tema.js) | Script do tema saiu do HTML (a CSP proíbe scripts embutidos) |
| [src/lib/exportar.ts](src/lib/exportar.ts) | Célula de CSV que começa com `= + - @` ganha apóstrofo |
| [src/lib/importacao/arquivos.ts](src/lib/importacao/arquivos.ts) | Arquivo até 300 MB; .zip até 600 MB descompactado e 5.000 arquivos; .gz até 200 MB — conferido pelo tamanho declarado, antes de descompactar |
| [src/lib/forca/exercisedb.ts](src/lib/forca/exercisedb.ts) | Tempo limite de 10 s, sem cookies/referrer; validação de id (`[A-Za-z0-9]{5,12}`) antes de montar URL ou consulta; respostas e cache validados e com tamanho limitado; GIF sempre do domínio oficial |
| [src/components/DialogPrivacidade.tsx](src/components/DialogPrivacidade.tsx), [src/hooks/usePrivacidade.ts](src/hooks/usePrivacidade.ts) | Finalidade de cada dado, **Baixar meus dados (JSON)** e **Excluir minha conta** (pede a senha de novo e a palavra EXCLUIR) |

### Endurance — [supabase/migrations/20261102130000_endurance.sql](supabase/migrations/20261102130000_endurance.sql) e [api/ai-endurance.ts](api/ai-endurance.ts) (02/11/2026)

Tabelas criadas depois da migração 9 não recebem as proteções automaticamente; esta migração repete o padrão à mão:

1. **`treino_parciais` e `sugestoes_salvas`**: RLS "só o dono", sem acesso anônimo, `grant` explícito para
   `authenticated`, FK composta `(treino_id, user_id)` e `(sugestao_id, user_id)` (não dá para pendurar parcial no treino
   de outra pessoa nem agendar a sugestão de outra), limites em todo texto (nome 120, descrição 2.000, estilo 40,
   referência 120), JSON da estrutura até 64 KB e só objeto, faixas numéricas (FC 30–250, potência até 3.000 W…).
   Exclusões de sugestões salvas entram na auditoria; as parciais não (são recriadas a cada reimportação e já somem
   com o treino, que é auditado).
2. **`importar_treinos(jsonb)`**: `security invoker` (o RLS vale), `search_path` fixo, colunas gravadas uma a uma (o
   `user_id` do JSON é ignorado — vale `auth.uid()`), lote de 1 a 50 treinos e até 2.000 parciais por treino, origem
   obrigatória (`arquivo` ou `ai_endurance`), tudo numa transação. A checagem de duplicidade usa só os treinos do
   próprio usuário. Execução liberada só para `authenticated`.
3. **Vínculo com a AI Endurance**: uma chave de parceiro lê **qualquer** atleta do parceiro, então o atleta de cada
   usuário fica em `privado.ai_endurance_atletas` (fora da API; só o dono do projeto grava, pelo SQL Editor) e
   `public.ai_endurance_atleta()` (`security definer`, `search_path` fixo) devolve apenas o do usuário do token. Id do
   atleta validado (`[A-Za-z0-9_-]{1,64}`).
4. **Função da Vercel**: exige `Authorization: Bearer <token do Supabase>` e valida o token chamando a função acima no
   próprio Supabase (assinatura conferida pelo PostgREST); o atleta vem do banco, **nunca da URL** (`?user=` é
   ignorado); só três ações (`status`, `atividades`, `treinos`) e só GET; modalidade e página validadas; ids da
   AI Endurance validados antes de entrar em URL; tempo limite de 20 s; resposta da AI Endurance até 4 MB e só JSON;
   erros traduzidos sem repassar o corpo de erro de terceiros nem a chave; do perfil do atleta, só zonas, CSS e `.zwo`
   voltam ao navegador; respostas com `Cache-Control: no-store`. A CSP não mudou: o navegador fala só com a mesma
   origem (`/api`).
5. **Dados da AI Endurance no navegador** são tratados como não confiáveis: campos convertidos e limitados (textos
   cortados, números conferidos por faixa antes de gravar, mesmas faixas do banco), `.zip` de `.zwo` limitado a 20 MB
   descompactado e 200 arquivos, XML lido com `DOMParser` (sem executar nada).

## 4. Testes automatizados

```bash
npm test                # tudo (≈ 4 s)
npm run test:seguranca  # mesmos testes de segurança
npm audit               # dependências
```

- **Banco** ([tests/banco/seguranca.test.ts](tests/banco/seguranca.test.ts)): aplica **todas as migrações** num
  Postgres 17 real (PGlite) com o mínimo do Supabase simulado e testa: RLS ligado em todas as tabelas; anon sem
  nenhuma permissão em tabela/view/função; `search_path` fixo nas `security definer`; leitura sem login; acesso ao
  schema `privado`; **IDOR** (outro usuário lê, altera e apaga pelo id em 7 tabelas → 0 linhas); gravar em nome de
  outro; trocar o dono; ligar registro próprio a registro alheio (4 casos de FK composta); SQL injection gravada
  como texto; textos e JSON gigantes; valores fora das regras; cadastro fora da lista; link do lembrete; campos de
  controle do lembrete; limite de envio de teste; mensagem sem detalhe de infraestrutura; auditoria; exclusão de
  conta (apaga só a própria); regressão das funções e views usadas pelo app.
- **Frontend e configuração** ([tests/frontend/seguranca.test.ts](tests/frontend/seguranca.test.ts)): injeção de
  CSV; ids, respostas, tempo limite, 503, falta de rede e cache adulterado da ExerciseDB; zip bomb e arquivo grande;
  mensagens de erro; nenhum segredo no código, nas migrações e no bundle (`dist/`); `.env` fora do git; cabeçalhos da
  Vercel; HTML sem script embutido.

Resultado em 01/11/2026: **62 testes passando**, `npm audit`: 0 vulnerabilidades, `tsc` e build sem erros.

- **Módulo Pessoal** ([tests/banco/pessoal.test.ts](tests/banco/pessoal.test.ts) e
  [tests/frontend/pessoal.test.ts](tests/frontend/pessoal.test.ts)): Bíblia somente leitura (alterar, inserir e
  apagar dão “permission denied”; anônimo não lê); IDOR em 7 tabelas novas; FK composta em 8 vínculos (objetivo →
  área, meta → objetivo, progresso/marco → meta, registro → hábito, tarefa → meta/área, meta → prova); views e
  funções de cálculo só enxergam os dados de quem consulta; limites (diário, gratidão, humor, frequência, 3
  prioridades por dia); exclusão de conta apaga o módulo; e os cálculos (sequência no fuso de São Paulo, meta diária,
  adiantado/atrasado, hábitos, metas, resumo da semana). No frontend: leitor do módulo da Bíblia usado pelo seed e
  conferência do texto antes de gravar. Total do projeto em 01/11/2026: **107 testes passando**.

- **Endurance** ([tests/banco/endurance.test.ts](tests/banco/endurance.test.ts),
  [tests/frontend/endurance.test.ts](tests/frontend/endurance.test.ts), [tests/api/ai-endurance.test.ts](tests/api/ai-endurance.test.ts)):
  importação sem duplicidade (mesmo arquivo, outra fonte a 2 min, "completar" mantendo nome/anotação, reimportação
  substitui as parciais, transação desfeita com valor inválido, lote vazio/grande demais, sem login); deduplicação só
  contra os próprios treinos; FK composta das parciais e das sugestões; vínculo da AI Endurance ilegível e imutável
  para o usuário. Na função da Vercel: sem token, token inválido, ação/método/modalidade/página inválidos, `?user=` da
  URL ignorado, chave de parceiro ausente das respostas (inclusive em erro), 401/404/429/5xx/tempo limite/resposta não
  JSON da AI Endurance e filtragem dos dados do atleta. Também: cálculo das parciais, `.fit` gerado com o encoder
  oficial, catálogo, zonas, recomendação e planejado × realizado. Vínculo com o treino planejado ([tests/banco/vinculo.test.ts](tests/banco/vinculo.test.ts)): automático só sem dúvida, dia de São Paulo, planejado de outra pessoa ou de outra modalidade intocado, uma atividade não conta para dois planejados. Total do projeto em 02/11/2026: **243 testes passando**.

**Não testado aqui**: o projeto Supabase real (as migrações foram validadas no PGlite, não no seu banco), os
cabeçalhos servidos de fato pela Vercel, e varreduras dinâmicas (OWASP ZAP) e SAST (Semgrep) — recomendadas na seção 7.

## 5. Riscos que permanecem

| Risco | Por quê | Mitigação |
|---|---|---|
| Sessão em `localStorage` | Sem servidor próprio, cookies HttpOnly não são possíveis com o Supabase num SPA estático | CSP rígida para scripts; sem HTML dinâmico; expiração curta do JWT (seção 6) |
| CORS da API do Supabase aberto | O Supabase hospedado não permite restringir origens da API REST | Toda chamada exige JWT; RLS decide o acesso. CSRF não se aplica (sem cookie de sessão) |
| Sem limite de requisições por usuário na API REST | O PostgREST hospedado não oferece isso | Cadastro fechado + limites de tamanho; Auth tem limites próprios (seção 6) |
| Lembrete para qualquer endereço | Regra de negócio: pode mandar para outra pessoa da família | Link e frequência travados; com cadastro fechado, só contas autorizadas |
| `style-src 'unsafe-inline'` na CSP | Gráficos e componentes usam estilo inline | Scripts continuam bloqueados |
| Chave de parceiro da AI Endurance com alcance amplo | A Partner API usa uma chave por parceiro, não por atleta (sem OAuth) | Chave só no servidor; atleta definido no banco pelo dono; trocar a chave no admin da AI Endurance se vazar |
| Formato das respostas da AI Endurance não verificado | O formato das atividades só está no ReDoc com login de parceiro | Leitura defensiva com limites; o que não é reconhecido vira aviso, não erro |
| Sem limite de requisições próprio na função da Vercel | Plano gratuito, sem armazenamento para contar pedidos | Exige sessão válida; a AI Endurance limita 1.000 req/h por atleta |
| Backups | Plano gratuito do Supabase não tem backup automático | Seção 6 (exportação e plano pago) |
| Chave secreta no seed da Bíblia | Gravar o texto exige ignorar o RLS (as tabelas da Bíblia são somente leitura para o app) | O script roda só no computador do dono, lê a chave do terminal, recusa a chave pública e nunca a imprime; não vai para a Vercel nem para o git (veja o README) |
| Demonstrações da ExerciseDB | Serviço de terceiros, limite de consultas estrito, uso só não comercial com crédito | Tempo limite, validação, cache; crédito na tela |

## 6. Configuração de produção (faça no painel)

1. **Rode a migração** `20261101150000_seguranca.sql` no SQL Editor (depois das anteriores).
2. **Feche o cadastro**: Authentication → Sign In / Providers → desligue **Allow new users to sign up**.
   Para criar alguém daqui em diante: `insert into privado.cadastro_permitido (email) values ('pessoa@exemplo.com');`
   e depois Authentication → Users → Add user.
3. **Revogue as credenciais do Strava** que passaram pela conversa: em strava.com/settings/api, gere um novo Client
   Secret (ou exclua o aplicativo, que não é mais usado) e, em Configurações → Meus aplicativos, revogue o acesso.
4. **Endereço oficial do app** (botão do lembrete), se mudou de domínio:
   `insert into privado.configuracao values ('app_url', 'https://seu-dominio') on conflict (chave) do update set valor = excluded.valor;`
5. **Auth** (Authentication → Sign In / Providers / Rate Limits / Attack Protection):
   senha mínima de 10 caracteres com letras e números; **Leaked password protection** (plano Pro); CAPTCHA
   (Turnstile ou hCaptcha) se o login for exposto a muitas pessoas; limites de tentativas de login padrão ou mais
   baixos; JWT expiry de 1 h (padrão) e **refresh token rotation + reuse interval** ligados (padrão); MFA (TOTP)
   para as contas.
6. **Database → Network restrictions**: se possível, restrinja o acesso direto ao Postgres; **SSL enforcement** ligado.
7. **Backups**: no plano gratuito, exporte com regularidade ("Meus dados e privacidade" → Baixar, e
   `supabase db dump`); no Pro, backups diários e PITR. Teste uma restauração num projeto separado.
8. **Domínio**: HTTPS é automático na Vercel; os cabeçalhos de `vercel.json` valem a partir do próximo deploy.
   Confira com https://securityheaders.com.

## 7. Recomendações adicionais

- Rodar **Semgrep** (`semgrep --config p/react --config p/typescript --config p/secrets`) e **OWASP ZAP** (baseline
  scan) contra um ambiente de testes, não contra a produção.
- Rodar `npm test` e `npm audit` a cada mudança (ou num CI, quando o projeto for para o GitHub).
- Ao criar tabela nova: `enable row level security`, política "só o dono", `revoke ... from anon`, grant explícito
  para `authenticated` e FK composta quando apontar para outra tabela do usuário. Função nova: grant explícito para
  `authenticated` (a migração de segurança tirou o `PUBLIC` padrão).
- Consultar periodicamente `privado.auditoria` e os logs do Supabase (Auth: logins e falhas; API: erros).
- Atualização disponível sem urgência de segurança: `@tanstack/react-query` 5.105.0 → 5.105.1.

## 8. LGPD — tratamento de dados

| Dado | Finalidade | Base | Retenção |
|---|---|---|---|
| E-mail e senha (hash bcrypt, Supabase Auth) | Autenticação | Execução do serviço | Até a exclusão da conta |
| Contas, lançamentos, rendas, caixinhas | Controle financeiro pessoal | Execução do serviço | Até o titular apagar ou excluir a conta |
| E-mail do lembrete | Envio do aviso de contas pendentes | Consentimento (o titular cadastra e desliga) | Até apagar o lembrete ou a conta |
| Treinos, agenda, metas, provas, rotinas e cargas | Acompanhamento esportivo | Execução do serviço | Até apagar ou excluir a conta |
| Nascimento, sexo, altura, peso, medidas, bioimpedância | Cálculos de IMC, gordura e gasto (**dado de saúde — sensível**) | Consentimento do titular (art. 11) | Até apagar ou excluir a conta |
| Refeições e alimentos | Balanço calórico | Execução do serviço | Até apagar ou excluir a conta |
| Objetivos, metas, hábitos, tarefas, revisões | Organização pessoal | Execução do serviço | Até apagar ou excluir a conta |
| Diário (humor, gratidão, texto) e leitura bíblica (capítulos, anotações, versículos marcados) | Acompanhamento pessoal e espiritual (**convicção religiosa e estado emocional — sensíveis**) | Consentimento do titular (art. 11) | Até apagar ou excluir a conta |
| Auditoria (só identificadores) | Segurança e investigação de incidentes | Legítimo interesse | 1 ano |

Direitos do titular no app: consulta e portabilidade (**Baixar meus dados**), correção (edição em cada tela) e
eliminação (**Excluir minha conta**). Nenhum dado é compartilhado com terceiros; a ExerciseDB recebe apenas o termo
ou o id do exercício pesquisado. Dados de um usuário nunca são usados para outro (RLS em todas as tabelas).
