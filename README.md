# Lucas Marques Dev

A página inicial (`/`) é o **portfólio profissional** público. O sistema é de uso pessoal: o acesso fica num
link discreto **área restrita** no rodapé, que leva à tela de login (`/login`), a mesma de sempre.

| Endereço | O que é | Login |
|---|---|---|
| `/` | Portfólio: sobre, experiência, habilidades, formação (com publicações) e contato | não |
| `/login` | Tela de login (Supabase Auth) | — |
| `/sistema` | Escolha do módulo, primeira tela depois do login | sim |
| `/financeiro`, `/triathlon`, `/pessoal` | Módulos | sim |

Depois do login, o usuário escolhe em qual módulo entrar (atalhos: teclas 1, 2...),
e dentro de cada módulo pode trocar de módulo tocando no nome dele no topo da tela.
O app instalado no celular (PWA) abre direto em `/sistema`.

**Textos do portfólio:** ficam todos em [src/lib/portfolio.ts](src/lib/portfolio.ts) (experiências, casos,
habilidades, formação e contatos); as seções estão em [src/components/portfolio/](src/components/portfolio/) e a
página em [src/pages/Portfolio.tsx](src/pages/Portfolio.tsx). Regras de conteúdo: nada inventado; números mantêm o
"~" do currículo e aparecem dentro da frase de origem.

**Casos de QA / Projetos** (`CASOS` em `portfolio.ts`, cartão em [Casos.tsx](src/components/portfolio/Casos.tsx)):
a seção está **fora da página** (`MOSTRAR_PROJETOS = false`); o caso continua guardado. Com `true`, voltam a seção, o
link "Projetos" no menu e a ação principal "Ver projetos" (sem ela, "Ver trajetória"); a numeração das seções
(`SECOES` / `numeroSecao`) se ajusta sozinha. Cada caso tem contexto, problema, riscos, participação, abordagem,
ferramentas, resultados, limites e links de evidência, e só aparece se passar em `casoPublicavel`.

**Animações** ([portfolio.css](src/components/portfolio/portfolio.css)): entrada do topo em menos de 1 s (nome letra
por letra, frases que se revezam, anel no botão principal, selos flutuando no desktop, terminal que se digita
sozinho); o resto acompanha a rolagem (scroll-driven animations, com linha do tempo que se desenha) — sem espera por
tempo, e quem não tem suporte vê tudo parado. "Reduzir movimento" desliga tudo (um teste confere).

**Currículo em PDF:** coloque o arquivo em `public/` e preencha `PERFIL.curriculo` (ex.: `/curriculo-lucas-marques.pdf`);
o botão "Baixar currículo" só aparece com o arquivo presente (um teste confere).

As fontes (Geist, Geist Mono e Instrument Serif) vêm do npm (`@fontsource`) e são servidas pelo próprio site, como a
CSP exige. O domínio usado no SEO (`index.html`, `public/robots.txt`, `public/sitemap.xml` e `PERFIL.site`) é
`https://www.lucasmarquesdev.com.br` (o endereço sem `www` redireciona para ele).

| Módulo | Endereço | Situação |
|---|---|---|
| **Financeiro** | `/financeiro` | Controle das contas fixas mensais da família: você cadastra as contas uma vez (os "modelos") e o app monta a lista de cada mês sozinho, com checkbox de pago, totais automáticos, parcelas, histórico, exportação, rendas e caixinhas de economia. |
| **Triathlon** | `/triathlon` | Treinos de natação, ciclismo e corrida (registro manual ou arquivos do relógio), agenda semanal com metas por modalidade, carga de treino e forma, evolução de volume e ritmos, corpo (peso, IMC, composição e medidas), alimentação, provas-alvo. Veja [a seção do Triathlon](#módulo-triathlon). |
| **Pessoal** | `/pessoal` | Meu dia, objetivos e metas do ano por área da vida, leitura da Bíblia com plano anual, hábitos, tarefas, diário e revisões semanal e mensal. Veja [a seção do Pessoal](#módulo-pessoal). |

Os módulos ficam em [src/modulos.ts](src/modulos.ts). Para criar um novo: registre-o ali, crie um layout
com `LayoutModulo` (veja [LayoutTriathlon.tsx](src/components/layout/LayoutTriathlon.tsx)) e adicione as rotas em [App.tsx](src/App.tsx).

**Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui · Supabase (Auth, Postgres, RLS) · deploy na Vercel.

---

## 1. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito serve).
2. No painel, abra **SQL Editor → New query**, cole e rode **nesta ordem**:
   1. [supabase/migrations/20261031120000_estrutura.sql](supabase/migrations/20261031120000_estrutura.sql) — tabelas, índices e RLS
   2. [supabase/migrations/20261031120100_funcoes.sql](supabase/migrations/20261031120100_funcoes.sql) — funções e views de totais
   3. [supabase/migrations/20261031130000_lembretes_email.sql](supabase/migrations/20261031130000_lembretes_email.sql) — lembrete por e-mail (veja abaixo)
   4. [supabase/migrations/20261031140000_rendas_economia.sql](supabase/migrations/20261031140000_rendas_economia.sql) — rendas e caixinhas (aba Economia)
   5. [supabase/migrations/20261031150000_triathlon.sql](supabase/migrations/20261031150000_triathlon.sql) — módulo Triathlon
   6. [supabase/migrations/20261101120000_corpo.sql](supabase/migrations/20261101120000_corpo.sql) — bioimpedância e medidas nas pesagens, plano de peso com meta semanal (e remove a antiga integração com o Strava). Pode rodar de novo sem problema
   7. [supabase/migrations/20261101130000_agenda_treinos.sql](supabase/migrations/20261101130000_agenda_treinos.sql) — Agenda: metas semanais e treinos planejados. Pode rodar de novo sem problema
   8. [supabase/migrations/20261101140000_musculacao.sql](supabase/migrations/20261101140000_musculacao.sql) — Musculação: rotinas de força, exercícios de cada treino agendado e séries registradas. Pode rodar de novo sem problema
   9. [supabase/migrations/20261101150000_seguranca.sql](supabase/migrations/20261101150000_seguranca.sql) — **segurança**: cadastro só para e-mails autorizados, proteção do lembrete, limites de tamanho, auditoria e exclusão de conta. Veja [SEGURANCA.md](SEGURANCA.md)
   10. [supabase/migrations/20261102120000_pessoal.sql](supabase/migrations/20261102120000_pessoal.sql) — módulo **Pessoal**: livros da Bíblia e planos de leitura, objetivos, metas, hábitos, tarefas, diário, revisões e os cálculos (sequências, progresso, atrasos). Pode rodar de novo sem problema. **Depois dela, importe o texto da Bíblia uma vez:** veja [Bíblia: importar o texto](#bíblia-importar-o-texto-uma-vez)
   11. [supabase/migrations/20261102130000_endurance.sql](supabase/migrations/20261102130000_endurance.sql) — **parciais** dos treinos importados, **sugestões salvas** de corrida/pedal/natação, estrutura do treino planejado, importação sem duplicidade (`importar_treinos`) e vínculo com a **AI Endurance**. Pode rodar de novo sem problema
   12. [supabase/migrations/20261102140000_vinculo_importacao.sql](supabase/migrations/20261102140000_vinculo_importacao.sql) — treino importado ou registrado à mão **conclui sozinho o treino planejado** do dia na Agenda (`vincular_ao_planejado`). Rode depois da 11; pode rodar de novo sem problema

   > Se usar a Supabase CLI: `supabase link --project-ref SEU-REF` e depois `supabase db push`.

3. Pegue as chaves em **Project Settings → API** (ou botão **Connect**):
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / publishable key** → `VITE_SUPABASE_ANON_KEY`

   Nunca use a `service_role` / `secret` key no app.

## 2. Rodar no computador

Requer Node.js 22.12 ou mais novo.

```bash
cp .env.example .env.local     # e preencha as duas variáveis
npm install
npm run dev                    # abre em http://localhost:5173
```

## 3. Publicar na Vercel

**Opção A — pelo GitHub (recomendado):**

```bash
git init
git add .
git commit -m "Contas do Mês"
# crie um repositório vazio no GitHub e:
git remote add origin https://github.com/SEU-USUARIO/contas-do-mes.git
git push -u origin main
```

Na Vercel: **Add New → Project →** importe o repositório. O framework (Vite) é detectado
sozinho pelo [vercel.json](vercel.json). Em **Environment Variables** adicione
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e clique em **Deploy**. (Opcional: `AI_ENDURANCE_PARTNER_ID` e
`AI_ENDURANCE_API_KEY` para a [integração com a AI Endurance](#integração-ai-endurance-opcional).)

**Opção B — pela linha de comando:**

```bash
npx vercel            # primeira vez: responde as perguntas
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel --prod
```

> Se você instalou a integração **Supabase** pelo marketplace da Vercel, as variáveis
> `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` criadas por ela também funcionam.

### Usuários

A tela de login só entra: não tem "Criar conta" nem "Esqueci minha senha". Os usuários são
gerenciados no painel do Supabase:

- **Criar:** Authentication → Users → **Add user → Create new user**, com e-mail e senha, marcando
  **Auto Confirm User**.
- **Trocar a senha de alguém** (SQL Editor):
  ```sql
  update auth.users
     set encrypted_password = extensions.crypt('NovaSenha123', extensions.gen_salt('bf'))
   where email = 'pessoa@exemplo.com';
  ```
- **Fechar o cadastro público:** Authentication → Sign In / Providers → desligue
  **Allow new users to sign up**. A migração 9 também barra no banco qualquer e-mail fora da lista
  `privado.cadastro_permitido` — para criar alguém novo, libere antes o e-mail (SQL Editor):
  ```sql
  insert into privado.cadastro_permitido (email) values ('pessoa@exemplo.com');
  ```
- **Meus dados e privacidade** (menu do usuário): mostra o que o app guarda e para quê, baixa todos os dados
  em JSON e exclui a conta com tudo dela (LGPD).

Depois do deploy, coloque o endereço da Vercel em **Authentication → URL Configuration → Site URL**.

---

## Como usar

| Tela | O que faz |
|---|---|
| **Mês** | Escolha o mês nas setas. **Gerar mês** cria os lançamentos a partir das contas ativas (pode clicar de novo: não duplica, só adiciona o que falta). Marque como pago no checkbox, toque na conta para mudar o valor **só daquele mês**, copie o código de pagamento com um clique. Contas vencidas ficam em vermelho. Busca e filtro por responsável e situação. Exporta para Excel ou CSV. |
| **Economia** | Balanço do mês (renda − contas − guardado = sobra livre). **Rendas**: fixas (salário — entram sozinhas no "Gerar mês") ou avulsas (13º, freela), com checkbox de recebido. **Caixinhas**: objetivos de economia com meta opcional, valor planejado por mês, data alvo, botões Guardar/Retirar, extrato e previsão de quando a meta é atingida. |
| **Contas** | Cadastro dos modelos, agrupados por categoria: valor padrão, dia de vencimento, código de pagamento (boleto/PIX/contrato), responsável e parcelamento. |
| **Categorias** | Nome, cor e ordem de exibição (setas ↑ ↓). |
| **Histórico** | Barras com o total dos últimos 12 meses, pizza por categoria e comparação com o mês anterior (R$ e %). |

No primeiro acesso aparece a opção **Importar dados de exemplo**, que cadastra as 6 categorias
e as 22 contas da planilha e já gera o mês atual. Ela também fica no menu do usuário (ícone no canto superior direito).

**No celular:** abra o site no navegador e use "Adicionar à tela inicial" — ele abre como um app.

### Lembrete por e-mail das contas não pagas

Nos dias **1, 6, 11, 16, 21 e 26, às 8h** (Brasília), o app envia por e-mail a lista das contas não
pagas do mês, com total pendente, vencidas em destaque e códigos de pagamento. Se tudo estiver pago,
não envia nada. No dia 1, se o mês ainda não foi gerado, ele é gerado antes do envio.

O envio usa o [Resend](https://resend.com) (gratuito até 3.000 e-mails/mês), chamado pelo próprio banco
(`pg_net`), com agendamento do `pg_cron` — não há servidor extra para publicar.

1. Crie uma conta no Resend **com o mesmo e-mail que vai receber os lembretes** e gere uma chave em
   **API Keys** (permissão *Sending access*). Sem domínio próprio, o Resend só envia para o e-mail dono da conta.
2. No SQL Editor do Supabase, rode
   [supabase/migrations/20261031130000_lembretes_email.sql](supabase/migrations/20261031130000_lembretes_email.sql).
3. Ainda no SQL Editor, guarde a chave no Vault (criptografado):
   ```sql
   select vault.create_secret('re_SUA_CHAVE_AQUI', 'resend_api_key');
   ```
4. No app: menu do usuário → **Lembretes por e-mail** → informe o e-mail → **Enviar teste agora**.

Mais tarde, com um domínio verificado no Resend, você pode trocar o remetente:
`select vault.create_secret('Contas <contas@seudominio.com.br>', 'lembrete_remetente');`

Para conferir ou mudar o agendamento:
```sql
select * from cron.job;                              -- agendamentos
select * from cron.job_run_details order by start_time desc limit 10;  -- execuções
select * from net._http_response order by created desc limit 10;      -- respostas do Resend
select cron.unschedule('lembrete-contas-pendentes'); -- desliga para todos
```

Se o SQL reclamar das extensões, ative **pg_cron** e **pg_net** em Database → Extensions e rode o arquivo de novo.

### Contas parceladas

Informe a parcela atual, o total e **a qual mês essa parcela se refere** (ex.: "Tratamento Sil",
parcela 5 de 33 em outubro/2026). O app calcula sozinho a parcela de qualquer mês (novembro = 6/33…),
mostra "5/33" no painel, para de lançar depois da última parcela e marca a conta como encerrada.

### Valores e totais

- Mudar o valor de um mês não altera o modelo. Ao editar o valor padrão de uma conta, você pode
  optar por aplicá-lo também aos lançamentos ainda não pagos a partir do mês atual.
- Nenhum total é digitado: o painel soma os lançamentos, o banco tem as views
  `v_totais_mes` e `v_totais_categoria_mes`, e o Excel exportado usa fórmulas (`SOMA`, `SOMASES`).

---

## Módulo Triathlon

| Tela | O que faz |
|---|---|
| **Painel** | Prova principal com contagem regressiva e fase sugerida (base, construção, específico, polimento), volume da semana por modalidade, forma do dia, últimos treinos e peso (com IMC e W/kg). |
| **Treinos** | Treinos do mês agrupados por semana, filtro por modalidade, registro manual (com esforço percebido 1–10) e **Importar treino** (arquivo do relógio ou AI Endurance). Tocar num treino abre os detalhes com as **parciais** e o **planejado × realizado**. Veja [Importar treinos e parciais](#importar-treinos-e-parciais). |
| **Agenda** | Calendário mensal e semanal dos treinos planejados (corrida, natação, pedal e academia), situação de cada treino (concluído, perdido, pendente), metas por semana com barras de progresso, treinos feitos fora do plano, evolução das últimas 12 semanas e resumo por mês. Aba **Musculação**: sugestão de rotina, registro de cargas e progressão. Aba **Endurance**: sugestões de corrida, pedal e natação. Veja [Agenda](#agenda-metas-semanais-e-treinos-planejados), [Musculação](#musculação-sugestão-de-rotina-e-progressão-de-carga) e [Endurance](#endurance-sugestões-de-corrida-pedal-e-natação). |
| **Evolução** | Volume semanal por modalidade, condicionamento/fadiga/forma, pace da corrida, velocidade no ciclismo, ritmo na natação, peso × pace (com correlação) e recordes. |
| **Corpo** | Peso e altura → IMC com a tabela da OMS e a faixa de peso normal para a sua altura; % de gordura (balança, método da Marinha pelas medidas ou estimada pelo IMC), massa magra/gorda e FFMI; cintura, cintura ÷ altura, cintura ÷ quadril e gordura visceral; dados da bioimpedância; peso de referência (fórmulas clássicas e peso para cada % de gordura); taxa basal por 4 fórmulas, gasto dos treinos e necessidades de proteína, carboidrato, gordura e água; tendência em kg/semana; **meta semanal** até o peso objetivo, com metas semana a semana e previsão de chegada; gráficos e histórico. Veja [Corpo](#corpo-peso-imc-e-composição). |
| **Nutrição** | Alimentação do dia (calorias e macros × metas, gasto dos treinos, balanço estimado, alimentos salvos, repetir dia anterior). |
| **Provas** | Provas-alvo com prioridade A/B/C, distâncias, meta de tempo e resultado. |
| Menu do usuário → **Perfil do atleta** | FTP, FC de limiar, pace de limiar, CSS, metas — e as zonas de FC e potência calculadas. |

### Carga, condicionamento, fadiga e forma

Cada treino recebe uma **carga** ≈ horas × (intensidade)² × 100, em que intensidade 1 = seu limiar. A intensidade
vem da potência ÷ FTP (ciclismo), do pace ÷ pace de limiar (corrida), do ritmo ÷ CSS (natação, ao cubo), da FC ÷ FC
de limiar ou do esforço percebido — nessa ordem de preferência. Por isso vale preencher o **Perfil do atleta**.

- **Condicionamento**: média exponencial da carga dos últimos 42 dias.
- **Fadiga**: média exponencial dos últimos 7 dias.
- **Forma**: condicionamento − fadiga ao fim do dia anterior (positivo = descansado; muito negativo = sobrecarga).

### Agenda: metas semanais e treinos planejados

A semana vai de segunda a domingo (como no resto do app). No calendário mensal, toque num dia para ver, planejar,
editar, reagendar (mudando a data) ou excluir treinos; toque em **S44** (número da semana) para escolher a semana.
A visão **Semana** mostra os treinos de cada dia em detalhe. Mês, semana e visão ficam no endereço da página.

- **Metas**: cada semana tem as próprias (corrida e pedal em km, natação em metros, academia em sessões). Dá para
  copiar da semana anterior e aplicar também às próximas semanas; semanas anteriores nunca mudam.
- **Situação**: ✓ concluído (verde), ✗ perdido (vermelho), ◌ pendente (amarelo), com um toque. Ao concluir, você
  informa a distância e a duração feitas — só isso conta para a meta (planejou 10 km e fez 8: contam 8). Perdido não
  conta. Pendente vira perdido só depois que o dia termina e ainda pode ser marcado como concluído.
- **Ligação com Treinos**: ao concluir, dá para vincular a atividade daquele dia (importada do relógio ou registrada
  à mão) ou registrar uma nova em Treinos, para entrar na carga e na forma. Atividades da semana que não estão no
  plano aparecem em **Feitos fora do plano**, com o botão **Incluir**. Excluir um treino da agenda não apaga a atividade.
- **Copiar semana**: numa semana vazia, **Copiar da semana anterior** repete os treinos como pendentes.
- **Provas**: as provas cadastradas em **Provas** aparecem sozinhas no calendário (etiqueta com bandeira no mês, cartão
  com tipo, distâncias, local e meta/resultado na semana e no dia) e no painel da semana. Criou, editou ou apagou em
  Provas, a Agenda acompanha.
- **Painel**: mostra os treinos de hoje (com a marcação rápida) e as metas da semana.

### Musculação: sugestão de rotina e progressão de carga

Na Agenda, aba **Musculação**:

1. **Configure**: objetivo principal (emagrecimento, hipertrofia ou recomposição) e secundário (desempenho no
   triathlon ou saúde), nível, academia ou casa (com os equipamentos que você tem), 2 a 6 dias, foco (corpo inteiro,
   superiores, inferiores ou força e condicionamento) e tempo por sessão (30, 45, 60 ou 90 min).
2. **Gere a sugestão** ou use o **modelo Full Body 3 dias** (A força geral, B hipertrofia, C volume e
   condicionamento). A sugestão explica por que ficou assim e avisa o que merece atenção.
3. **Edite**: troque exercícios por alternativas do mesmo padrão de movimento, mude séries, repetições, descanso, ordem
   e dias; adicione exercícios do catálogo ou digitados. **Salve** e **coloque na agenda** (semana de início, quantas
   semanas, dias da semana e por qual treino começar).
4. **Registre**: no calendário, ✓ num treino de academia abre o registro série por série (carga, repetições, esforço
   RPE e técnica), com a última vez que você fez cada exercício e a sugestão de carga para hoje.

Como a sugestão é montada (sem sorteio — [src/lib/forca/recomendacao.ts](src/lib/forca/recomendacao.ts)):

| Regra | Como funciona |
|---|---|
| Divisão | 2 dias: Full Body A/B · 3: Full Body ABC (avançado + hipertrofia: empurrar/puxar/pernas) · 4: Upper/Lower · 5: Upper/Lower + ABC · 6: ABC 2×. Iniciante fica em até 4 dias |
| Objetivo | hipertrofia 8–12 (compostos) e 10–15 (isolados) · recomposição 6–10 · emagrecimento 10–15 com descanso curto e finalizador aeróbico · força e condicionamento 4–6 no exercício principal |
| Nível | iniciante só recebe exercícios de iniciante e menos séries; avançado ganha uma série nos compostos |
| Tempo | estima a sessão (aquecimento + séries + descanso) e tira primeiro o que é “se der tempo” |
| Corrida e pedal | com ~25 km+ de corrida ou ~100 km+ de pedal por semana (média de 4 semanas em Treinos): uma série a menos nos compostos de pernas, sem impacto e sem finalizador aeróbico |
| Treino longo | pernas pesadas não caem no dia nem na véspera do treino longo habitual; avisa pernas em dias seguidos |
| Natação | com 6.000 m+ por semana: menos desenvolvimento acima da cabeça e trabalho de posterior de ombro |
| Histórico | usa a última carga de cada exercício como referência; avisa se faz mais de 3 semanas sem musculação |

**Progressão de carga** ([src/lib/forca/progressao.ts](src/lib/forca/progressao.ts)): a carga só sobe quando todas as
séries chegaram ao topo da faixa, com técnica boa e esforço até RPE 8 (sobrando 2 repetições) — então sugere +5%
(pernas) ou +2,5% (demais), arredondado para 0,5 kg. Sem RPE registrado, no limite ou com técnica ruim, mantém. Abaixo
do mínimo duas vezes seguidas na mesma carga, sugere reduzir ~8%. Ao agendar um treino de academia, o app avisa se os
mesmos grupos foram treinados nas 48 h anteriores.

O painel da aba mostra planejados, concluídos e % da semana, volume (carga × repetições) das últimas 8 semanas,
séries por grupo muscular nesta semana e na passada, evolução de carga e 1RM estimada por exercício, a progressão de
cada exercício da rotina e o histórico de treinos.

#### Demonstrações dos exercícios (ExerciseDB)

Cada exercício mostra **como fazer**: animação (GIF), a dica de execução em português, músculo principal e secundários,
equipamento e o passo a passo original. Os dados vêm da versão gratuita da [ExerciseDB](https://oss.exercisedb.dev/docs)
— chamada direto do navegador, sem chave e sem variável de ambiente ([src/lib/forca/exercisedb.ts](src/lib/forca/exercisedb.ts)).

- **Onde aparece**: ao tocar num exercício da rotina ou do treino agendado (miniatura + **Como fazer**), no registro do
  treino (**Como fazer** ao lado de cada exercício) e no editor (▶ em cada exercício).
- **Exercícios do catálogo**: 27 já vêm ligados à demonstração conferida (mapa `DEMONSTRACAO`); os demais têm um termo
  de busca em inglês (`BUSCA`) — na primeira vez que a demonstração é aberta, o app busca, mostra o primeiro resultado
  com o aviso “confira se é o mesmo exercício” e guarda a escolha no navegador.
- **Trocar ou escolher**: **Escolher outra demonstração** busca na ExerciseDB (em inglês). No editor da rotina a escolha
  fica salva no exercício (`exercisedb_id` dentro de `exercicios`); nas outras telas, neste navegador. Exercício
  digitado à mão começa sem demonstração e abre direto na busca.
- **Limite de consultas**: a API gratuita bloqueia rajadas de pedidos. Por isso o GIF é carregado direto do endereço
  fixo (`static.exercisedb.dev/media/<id>.gif`, sem consulta), e os detalhes só são buscados ao abrir a demonstração
  e ficam guardados no navegador. Se aparecer “limitando as consultas”, espere alguns segundos e toque em **Tentar de novo**.
- **Idioma**: a ExerciseDB só tem dados em inglês; músculos e equipamentos são traduzidos no app, o passo a passo fica
  no original (a dica em português vem do catálogo do app).
- **Termos de uso**: a versão gratuita é para uso pessoal e não comercial, com crédito obrigatório à
  [AscendAPI](https://ascendapi.com) — o crédito aparece em toda demonstração. Para uso comercial é preciso o plano pago
  (RapidAPI).

### Importar treinos e parciais

Não há conexão com Strava ou TrainingPeaks. Os treinos entram **à mão** (Treinos → **Novo treino**) ou por
**Importar treino** (no Painel, em Treinos e no aviso de mês vazio) — sempre treinos **já realizados**:

- **Arquivo do relógio**: `.fit`, `.tcx`, `.gpx` (Garmin, Wahoo, Coros, Polar…), o `.csv` de resumo do TrainingPeaks e
  `.zip`/`.gz` com vários arquivos (ex.: exportação em lote do Strava). Arquivo multiesporte vira um treino por modalidade.
- **AI Endurance**: busca as atividades da sua conta (corrida, pedal e natação), se a [integração](#integração-ai-endurance-opcional)
  estiver configurada.

**Direto do treino planejado:** na Agenda (lista do dia, visão da semana) e no card de hoje do Painel, cada treino de
corrida, pedal ou natação ainda sem atividade tem o botão **Importar o treino feito** (ícone de arquivo com seta). A
atividade escolhida conclui aquele treino, com a distância e o tempo feitos, e já entra no planejado × realizado. O
mesmo atalho aparece ao tocar em ✓ (concluir).

**Vínculo automático:** importando pela tela Treinos (ou registrando à mão em **Novo treino**), se no dia houver
**um único** treino planejado **pendente** da mesma modalidade, ele é concluído sozinho e vinculado à atividade (o dia
é o de São Paulo). Com dois ou mais planejados da modalidade no dia, nada é escolhido: conclua o certo na Agenda.
Treinos marcados como perdido não são tocados. A prévia avisa antes de gravar (“Vai concluir “Tempo run” da Agenda”).

A prévia mostra data, duração, distância, FC, potência e quantas parciais vieram. **Duplicidade**: é o mesmo treino
quando a modalidade é igual e o início difere em até 3 minutos — venha de arquivo, da AI Endurance ou de registro à
mão. Ele aparece como **já existe** e fica de fora; marque a caixa para **completar** o treino existente com as medidas
e as parciais do arquivo (nome, esforço e anotações continuam os seus, e o vínculo com a Agenda se mantém). A regra
vale também no banco (`importar_treinos`): mesmo que a tela falhe, não entra registro duplicado.

**Parciais** (gravadas em `treino_parciais`, para consultar e comparar depois):

| Modalidade | Parciais | Colunas |
|---|---|---|
| Corrida | por km (calculado das amostras de GPS/distância, com interpolação no ponto exato de cada km) e as voltas do relógio | tempo, pace, FC média/máx, subida/descida, cadência (passos/min) |
| Ciclismo | voltas do relógio e a cada 5 km | tempo, velocidade, potência, cadência, FC, subida/descida |
| Natação | séries (voltas, com o descanso marcado) e cada piscina (.fit de piscina); águas abertas: a cada 100 m | distância, tempo, pace/100 m, braçadas, estilo |

Na tela de detalhes do treino, a aba **Parciais** mostra a tabela, o total e os destaques: **mais rápida**, **mais
lenta** (sem o último trecho incompleto e sem os descansos) e **média geral** (tempo total ÷ distância total; FC e
potência ponderadas pelo tempo). Intervalos sem amostras por mais de 30 s contam como pausa. Treinos à mão e o `.csv`
do TrainingPeaks não têm parciais — a tela explica e sugere importar o arquivo e completar.

### Endurance: sugestões de corrida, pedal e natação

Na Agenda, aba **Endurance**, no mesmo formato da Musculação:

1. **Configure**: modalidade, objetivo (automático, resistência, limiar, velocidade, subidas, técnica, recuperação), nível
   e tempo disponível (30 min a 2 h).
2. **Gere as sugestões**: até 4 treinos do catálogo ([src/lib/sugestoes/catalogo.ts](src/lib/sugestoes/catalogo.ts)), cada um
   com **aquecimento, parte principal e desaquecimento** e a intensidade de cada passo em **zona** (Z1–Z6), **pace**
   (pelo pace de limiar), **potência** (pelo FTP), **ritmo/100 m** (pelo CSS), **FC** (pela FC de limiar) e **PSE** (0–10).
   Dá para ajustar as repetições da parte principal (− / +).
3. **Salve** (vai para **Meus treinos salvos**) e/ou **coloque na agenda** (com data). O formulário de planejar treino
   da Agenda também oferece os salvos e o catálogo.
4. Depois de treinar, **importe** o treino e, ao concluir o planejado, **vincule** a atividade. A aba
   **Planejado × realizado** (nos detalhes do treino e no treino planejado) compara totais (duração, distância, carga),
   **passo a passo** (quando o relógio gravou uma volta por passo) e o **tempo em cada zona** (pelas parciais), com uma
   nota de aderência de 0 a 100%.

| Modalidade | Treinos do catálogo |
|---|---|
| Corrida | rodagem leve, regenerativo, intervalado (800 m), tempo run, longão, fartlek, tiros em subida, progressivo |
| Ciclismo | endurance Z2, intervalos de limiar, sweet spot, VO₂máx, subidas, recuperação ativa, cadência e técnica |
| Natação | técnica e educativos, série aeróbica, limiar (CSS), tiros de velocidade, nado contínuo, pirâmide, recuperação |

**Como a sugestão escolhe** ([src/lib/sugestoes/recomendacao.ts](src/lib/sugestoes/recomendacao.ts)): no modo automático,
forma abaixo de −25 → recuperação primeiro; treino intenso na modalidade há menos de 48 h → só treinos leves; uma
semana ou mais sem treino longo e 75 min+ disponíveis → longo primeiro; senão, qualidade (limiar, velocidade). Treinos
que não cabem no tempo perdem repetições (até 2) e depois encurtam a parte contínua (até a metade); se ainda não
couberem, ficam de fora com o motivo. Sem limiar no Perfil do atleta, os alvos ficam por zona, FC e PSE (e o app avisa).

Se a integração com a AI Endurance estiver ativa, o cartão **Treinos do seu plano na AI Endurance** traz os treinos
futuros do plano, com os alvos dela (watts ou pace), para salvar ou agendar da mesma forma.

### Integração AI Endurance (opcional)

Segue a [Partner API da AI Endurance](https://github.com/ai-endurance/Partner-API-documentation) (documentação v2.4):
autenticação pelos cabeçalhos `PARTNER-ID` e `Authorization: Bearer <chave>`, base `https://aiendurance.xyz/api/`.
É uma API **para parceiros (empresas)**: o acesso é liberado pela AI Endurance, não é um login de atleta.

**O que o app usa:**

| Função | Endpoint |
|---|---|
| Atividades realizadas | `running_activity_detail_partner/`, `cycling_activity_detail_partner/`, `swimming_activity_detail_partner/` (`?user=`) |
| Treinos sugeridos | `training_plan_partner/?user=` → `future_workout_static_partner/?plan=`; zonas e `.zwo` em `usercore_partner/?user=` |

A chave fica numa **função serverless da Vercel** ([api/ai-endurance.ts](api/ai-endurance.ts)); o navegador só fala com
`/api/ai-endurance`, mandando o token da sessão. A função confere o token no Supabase e pega o atleta **no banco**
(nunca da URL) — com uma chave de parceiro dá para ler qualquer atleta do parceiro, então o vínculo é feito só pelo
dono do projeto.

**Passo a passo:**

1. Crie uma conta em [aiendurance.com](https://aiendurance.com) e peça acesso à Partner API por e-mail a
   `markus@aiendurance.com` (informe o e-mail da conta, o nome do projeto e o uso). Com o acesso liberado, entre em
   [aiendurance.xyz/admin](https://aiendurance.xyz/admin/): lá ficam o **Partner ID**, a **API key** e o ReDoc com os
   formatos completos.
2. Descubra o **id do atleta** na AI Endurance (no admin ou pelo `usercore_partner/` — é o `id` do atleta criado pelo
   parceiro, com os treinos sincronizados nele).
3. Rode a migração 11 e, no **SQL Editor** do Supabase, vincule o atleta à sua conta:
   ```sql
   insert into privado.ai_endurance_atletas (user_id, aie_user_id)
     select id, 'ID-DO-ATLETA' from auth.users where email = 'voce@exemplo.com'
   on conflict (user_id) do update set aie_user_id = excluded.aie_user_id;
   ```
4. Na Vercel → **Settings → Environment Variables**, cadastre `AI_ENDURANCE_PARTNER_ID` e `AI_ENDURANCE_API_KEY`
   (**sem** prefixo `VITE_`, senão iriam para o navegador) e faça um novo deploy. A função usa também
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, que já estão lá.
5. No computador: coloque as mesmas duas variáveis no `.env.local` — o `npm run dev` já serve a função em
   `/api/ai-endurance` (ou use `npx vercel dev`).
6. Teste: Treinos → **Importar treino** → aba **AI Endurance**. Sem configuração, a aba explica o que falta.

**Limites e o que ainda não está coberto:** a documentação pública não traz o formato da resposta das atividades (fica
no ReDoc, com login de parceiro), então a leitura aceita os nomes de campo mais comuns e, se algo não for reconhecido, o
aviso mostra os campos recebidos para ajustar [src/lib/integracao-ai-endurance/atividades.ts](src/lib/integracao-ai-endurance/atividades.ts).
Voltas e amostras só aparecem se a AI Endurance enviar; senão o treino entra **sem parciais** (importe o .fit para
completar). Os treinos sugeridos seguem o formato `steps` documentado (alvos em W ou m/s) e, como alternativa, o
`.zwo` do `zwift_zip`. A AI Endurance não documenta importação de GPX/TCX (só FIT) nem sandbox; os webhooks
(`fit_import_complete` etc.) não foram usados — a busca é sob demanda. Limite da API: 1.000 requisições/hora por atleta.

### Corpo: peso, IMC e composição

Em **Seus dados** ficam altura, sexo, nascimento e peso meta (os mesmos do Perfil do atleta). **Registrar peso** grava
só o peso do dia; **Medição completa** grava também o que a balança de bioimpedância mostra (gordura, músculo, água,
gordura visceral, osso) e as circunferências (cintura, quadril, pescoço, braço, coxa). Os cálculos usam sempre o
valor mais recente de cada medida.

| Cálculo | Fórmula / referência |
|---|---|
| IMC | peso ÷ altura²; faixas da OMS (e de Lipschitz a partir de 60 anos) |
| % de gordura | medida da balança; senão método da Marinha dos EUA (cintura, pescoço e, para mulheres, quadril); senão Deurenberg pelo IMC. Faixas do ACE (atleta, boa forma, média…) |
| Massa magra, FFMI | peso × (1 − % gordura); FFMI = massa magra ÷ altura², normalizado para 1,80 m |
| Cintura, cintura ÷ altura, cintura ÷ quadril | cortes da OMS (94/102 cm homens, 80/88 cm mulheres; RCQ 0,90/0,85) e de Ashwell (0,5) |
| Peso de referência | faixa de IMC 18,5–24,9, IMC 22, Devine, Robinson, Miller, Hamwi e o peso para cada % de gordura mantendo a massa magra |
| Taxa basal | Mifflin-St Jeor, Harris-Benedict revisada, Katch-McArdle e Cunningham (as duas últimas com % de gordura) |
| Gasto total | basal × 1,2 + média diária dos treinos dos últimos 28 dias (calorias do treino; sem elas, potência, 1 kcal/kg/km na corrida ou MET) |
| Tendência | regressão linear das pesagens das últimas 4 semanas, em kg e % do peso por semana, e previsão de quando chega na meta |

#### Meta semanal e previsão

Em **Meta semanal e previsão** você define o peso objetivo, quantos kg quer perder (ou ganhar) por semana, a data de
início e o peso no início (vem sozinho da média de 7 dias daquela data). Com isso o app mostra:

- **Meta de cada semana**: a média de peso planejada para a semana. A comparação é sempre média real × média do plano
  nos mesmos dias, porque comparar a média de 7 dias com o peso de um único dia daria ~3 dias de atraso. Cada semana
  passada aparece como cumprida, não cumprida ou sem pesagem.
- **Adiantado ou atrasado** em relação ao plano, em kg, e quanto precisaria por semana para ainda chegar na data.
- **Previsões de chegada**: pelo plano (do início), de hoje no ritmo do plano e no seu ritmo real (tendência).
- **Ritmo**: em % do peso por semana — perder até 1% é o recomendado; ganhar acima de 0,5% tende a virar gordura.
- **Déficit/superávit por dia**: kg por semana × 7.700 kcal ÷ 7, e quanto comer com base no gasto estimado.
- **Gráfico**: a linha laranja tracejada é o plano, desenhada até a data prevista (no máximo 1 ano à frente).

O formulário funciona como simulação: mude os valores e veja a previsão; **Salvar plano** grava e atualiza o gráfico e
o Painel (que mostra a meta da semana). **Recomeçar hoje** monta o plano a partir do peso atual.

---

## Módulo Pessoal

Separado do Triathlon, para o dia a dia, os objetivos do ano e a leitura bíblica. Ao abrir o módulo pela primeira vez, o
banco cria as áreas da vida padrão (Espiritual, Saúde, Família, Finanças, Carreira, Estudos e Pessoal) e a meta
**“Ler a Bíblia inteira no ano”**, que é atualizada sozinha pela leitura.

| Tela | O que faz |
|---|---|
| **Meu dia** | Saudação e data; leitura do dia pelo plano (com **Ler agora**), sequência de dias de leitura, hábitos do dia para marcar, as 3 prioridades e as tarefas de hoje, metas em andamento com barra de progresso e o humor do dia. Aos domingos, um atalho para a revisão semanal. |
| **Bíblia** | Plano de leitura (meta do dia, adiantado/atrasado e sugestão de recuperação), livros do Antigo e do Novo Testamento com o percentual lido de cada um, estatísticas (total, % da Bíblia, sequência e recorde, capítulos por mês e calendário de calor), **Meus versículos** e anotações. |
| **Leitura** | Capítulo com texto limpo, letra ajustável, modo escuro, capítulo anterior/seguinte. **Concluir capítulo** registra a data (do servidor), abre a anotação opcional (versículo que mais marcou, reflexão, aplicação prática) e depois o próximo capítulo do plano. Tocar num versículo marca com uma cor. Concluiu por engano? **Desmarcar**. |
| **Metas** | Objetivos do ano por área da vida e metas numéricas (com registro de progresso, data e observação), sim/não ou por marcos (etapas com checkbox). Visão anual com o progresso por área e alerta das metas atrasadas, comparando o esperado para a data com o realizado. Áreas personalizadas em **Áreas**. |
| **Hábitos** | Hábitos diários ou em dias da semana, check do dia, sequência, recorde, % da semana e do mês e os últimos 14 dias (dá para marcar um dia esquecido). |
| **Tarefas** | Hoje (com as 3 prioridades do dia, marcadas com estrela), próximos 7 dias e atrasadas; prioridade, área e vínculo opcional com uma meta. |
| **Diário** | Humor de 1 a 5, 3 motivos de gratidão e texto livre; revisão semanal guiada com o resumo automático da semana (hábitos, leitura, metas, treinos, tarefas e diário) e revisão mensal com o progresso das metas do ano. |

**Integração com o Triathlon:** uma meta numérica de um objetivo da área **Saúde** pode ser medida pelos treinos:
quantidade de treinos, distância total, horas, “treinar X vezes por semana” (conta as semanas em que você bateu a
frequência) ou completar uma prova-alvo (conclui quando o resultado da prova é registrado em **Provas**).

**Cálculos no servidor.** Sequências, percentuais, progresso esperado, adiantado/atrasado e o resumo da semana são
calculados no Postgres (view `metas_situacao` e as funções `leitura_resumo`, `leitura_estatisticas`,
`habitos_resumo`, `visao_anual` e `resumo_semana`), com as permissões de quem consulta. O “dia” é sempre o de
**São Paulo** (`America/Sao_Paulo`): um capítulo concluído às 22h30 conta para aquele dia, mesmo sendo 01h30 em UTC.

**Planos de leitura:** sequencial (Gênesis a Apocalipse), cronológico (aproximado: Jó junto de Gênesis, profetas
junto de Reis e Crônicas, cartas junto de Atos) e AT + NT em paralelo. A meta de cada dia é recalculada para terminar
no prazo: (capítulos que faltam no começo do dia) ÷ (dias que restam) — em 1 ano, 3 a 4 capítulos por dia. Se estiver
atrasado, o app mostra quantos capítulos e quanto ler por dia para recuperar em uma semana.

### Bíblia: importar o texto (uma vez)

O texto é a **Almeida de 1911** (reimpressão da edição de 1900 de João Ferreira de Almeida), de **domínio público**, com
a grafia da época (“creou”, “Christo”). Ela vem do módulo `PorAlmeida1911` da CrossWire Bible Society e fica
gravada no seu Supabase: durante a leitura o app não depende de nenhuma API externa.

1. Rode antes a migração 10 (`20261102120000_pessoal.sql`).
2. No Supabase, copie a **chave secreta**: **Project Settings → API Keys** → `service_role` (ou uma `sb_secret_...`).
   Ela só é usada no seu computador, para gravar o texto. **Não** coloque no `.env` com prefixo `VITE_`,
   **não** cadastre na Vercel e **não** faça commit dela.
3. No terminal, na pasta do projeto:

   PowerShell (Windows):
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY = "cole-a-chave-secreta-aqui"
   npm run seed:biblia
   Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
   ```

   Bash (Mac/Linux):
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="cole-a-chave-secreta-aqui" npm run seed:biblia
   ```

   O endereço do projeto vem do `VITE_SUPABASE_URL` do `.env.local` (ou defina `SUPABASE_URL`).

O script baixa o módulo (≈1,5 MB), confere se vieram os 66 livros e os 1.189 capítulos e grava 31.101 versículos em
lotes. Leva menos de um minuto. Pode rodar de novo: não duplica nada e os versículos marcados continuam valendo.

- **Só conferir, sem gravar:** `npm run seed:biblia -- --verificar`
- **Sem acesso ao CrossWire pelo terminal?** Baixe o .zip pelo navegador em
  `https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/PorAlmeida1911.zip` e rode
  `npm run seed:biblia -- --arquivo caminho/PorAlmeida1911.zip`.

Enquanto o texto não for importado, o app mostra um aviso na tela da Bíblia (o resto do módulo funciona normalmente).

## Banco de dados

| Objeto | Descrição |
|---|---|
| `categorias` | nome, cor, ordem |
| `contas` | modelos recorrentes: `valor_padrao`, `dia_vencimento`, `codigo_pagamento`, `responsavel`, `parcela_atual`, `total_parcelas`, `parcela_referencia`, `ativa` |
| `lancamentos` | uma linha por conta por mês (`competencia` = dia 1), `unique (conta_id, competencia)` |
| `gerar_mes(data)` | cria os lançamentos do mês sem duplicar; encerra parcelamentos concluídos |
| `importar_dados_exemplo()` | cadastra os dados da planilha (não duplica se rodar de novo) |
| `v_totais_mes`, `v_totais_categoria_mes` | totais (geral e por categoria) com pago/pendente |
| `rendas` | rendas fixas (modelos): `valor_padrao`, `dia_recebimento`, `responsavel`, `ativa` |
| `recebimentos` | renda de cada mês; sem `renda_id` = renda avulsa (com `descricao`) |
| `caixinhas` | objetivos de economia: `meta`, `aporte_mensal` (plano), `data_alvo`, `arquivada` |
| `movimentos_caixinha` | cada valor guardado (`aporte`) ou retirado (`retirada`) |
| `v_saldo_caixinhas` | saldo, total guardado e retirado de cada caixinha |
| `lembretes_email` | para qual e-mail enviar o lembrete de cada usuário (ativo/inativo, último envio) |
| `treinos` | atividades (manual, arquivo ou AI Endurance); `unique (user_id, origem, origem_id)` evita importar o mesmo arquivo duas vezes |
| `treino_parciais` | parciais de cada treino: `tipo` (km, volta, intervalo, piscina), `ordem`, tempo, distância, FC média/máx, potência, cadência, subida/descida, braçadas, estilo, `descanso`; `unique (treino_id, tipo, ordem)`; apagar o treino apaga as parciais |
| `importar_treinos(jsonb)` | grava treinos importados com as parciais em uma transação, sem duplicar (mesma chave ou mesma modalidade a até 3 min); `completar` atualiza o existente; cada treino conclui o planejado escolhido (`planejado` no item) ou o único pendente do dia |
| `vincular_ao_planejado(treino, planejado)` | liga a atividade a um treino planejado e o marca como concluído com a distância e o tempo feitos (usada também no registro à mão) |
| `sugestoes_salvas` | treinos de corrida/pedal/natação guardados: objetivo, nível, `fonte` (catálogo, AI Endurance, personalizada), `referencia`, duração, distância e `estrutura` (jsonb); `unique (user_id, fonte, referencia, nivel)` |
| `privado.ai_endurance_atletas`, `ai_endurance_atleta()` | qual atleta da AI Endurance é de qual usuário (só o dono do projeto grava; a função devolve só o do próprio usuário) |
| `perfil_atleta` | limiares (FTP, FC, pace, CSS) e metas de peso/nutrição |
| `metas_semanais` | meta por semana (segunda-feira) e modalidade: `distancia_m` ou, na academia, `sessoes`; `unique (user_id, semana, modalidade)` |
| `treinos_planejados` | treino de um dia: planejado (distância/duração), `status` pendente/concluído/perdido, realizado (só se concluído) e `treino_id` opcional apontando para a atividade em `treinos`; na academia, `rotina_id`, `rotina_treino` e a cópia dos `exercicios` do dia; em corrida/pedal/natação, a `estrutura` (blocos, repetições e zona/alvo de cada passo) e a `sugestao_id` de onde veio |
| `rotinas_forca` | rotina de musculação: configuração, divisão, dias e `treinos` (jsonb com os exercícios); só uma `ativa` por usuário, as antigas ficam guardadas |
| `series_forca` | cada série registrada (carga, repetições, RPE, técnica) de um treino planejado de academia |
| `pesagens` | uma medição por dia: peso (obrigatório), dados da bioimpedância e circunferências |
| `refeicoes`, `alimentos` | o que foi comido e alimentos salvos |
| `provas` | provas-alvo e resultados |
| `privado.enviar_lembretes()` | rodada agendada pelo `pg_cron`; o schema `privado` não é exposto pela API |
| `biblia_livros`, `biblia_capitulos`, `biblia_versiculos` | a Bíblia (somente leitura para quem está logado). O id do versículo é estável: livro·1.000.000 + capítulo·1.000 + versículo; a chave única `(livro_id, capitulo, versiculo)` serve de índice |
| `biblia_plano_ordem` | a ordem dos 1.189 capítulos em cada plano (sequencial, cronológico, paralelo) |
| `planos_leitura` | plano de leitura do usuário (tipo, início, fim); só um ativo |
| `leitura_progresso` | capítulos concluídos, com data/hora; `unique (user_id, livro_id, capitulo)` |
| `leitura_anotacoes`, `versiculos_marcados` | anotações ao concluir um capítulo e versículos marcados com cor |
| `areas_vida`, `objetivos`, `metas` | áreas da vida, objetivos do ano e metas (`tipo`, `valor_alvo`, `prazo`, `status`, `origem_automatica`: bíblia, treino ou nenhuma) |
| `metas_progresso`, `metas_marcos` | registros de progresso (o banco soma em `valor_atual`) e etapas das metas por marcos |
| `metas_situacao` | view: progresso de cada meta, fração esperada para hoje e situação (em dia, atrasada, concluída...) |
| `habitos`, `habitos_registros` | hábitos (`frequencia` em JSON: diária ou dias da semana) e o check de cada dia |
| `tarefas` | data, prioridade, área, meta opcional e `foco` (no máximo 3 por dia) |
| `diario`, `revisoes` | diário (um por dia) e revisões semanais/mensais (respostas em JSON) |

- **RLS** ativo nas três tabelas: cada usuário só lê e altera os próprios registros (`user_id = auth.uid()`).
  As views usam `security_invoker`, então respeitam o RLS. Chaves estrangeiras compostas impedem
  vincular uma conta à categoria de outro usuário.
- `parcela_referencia` foi acrescentada ao modelo pedido: guarda o mês em que `parcela_atual` vale,
  para o número da parcela de qualquer mês ser calculado sem depender da ordem em que os meses são gerados.
- Excluir uma conta apaga os lançamentos dela; para manter o histórico, **desative** em vez de excluir.

## Estrutura do código

```
src/
  modulos.ts      lista de módulos e as rotas de cada um (ROTA_INICIO, ROTA_LOGIN, ROTA_MODULOS)
  pages/          Portfolio (página inicial pública), Login, SelecaoModulo, Dashboard (Mês), Economia, Contas, Categorias, Historico
  pages/triathlon/   Painel, Treinos, Agenda, Evolucao, Corpo, Nutricao, Provas, PerfilAtleta
  pages/pessoal/     MeuDia, Biblia, Leitura, Metas, Habitos, Tarefas, Diario
  components/     layout/ (LayoutModulo, TrocarModulo, LayoutFinanceiro, LayoutTriathlon),
                  login/ (fundo animado), portfolio/ (seções da página inicial), dashboard/, economia/, contas/,
                  triathlon/ (agenda/, corpo/, forca/, importacao/, parciais/, sugestoes/),
                  pessoal/ (biblia/, metas/, habitos/, tarefas/), ui/ (shadcn)
  hooks/          useDados, useEconomia, useTriathlon, useParciais, useSugestoes, useAiEndurance, usePessoal, useBiblia (React Query), useAuth, useTema, useCompetencia
  lib/            portfolio (conteúdo do portfólio), format, exportar (Excel/CSV), triathlon (carga, forma, ritmos), corpo (IMC, gordura, faixas), agenda (semanas, metas, situação), forca/ (catálogo de exercícios, recomendação, progressão),
                  importacao/ (arquivos FIT/TCX/GPX/CSV, duplicidade), parciais/ (por km, volta, piscina; destaques),
                  sugestoes/ (zonas, catálogo, estrutura, recomendação, planejado × realizado),
                  integracao-ai-endurance/ (cliente, atividades, treinos "steps" e .zwo), pessoal (datas em São Paulo, planos, situação da leitura)
api/              ai-endurance.ts — função serverless da Vercel (a chave da AI Endurance só existe aqui)
scripts/          seed-biblia.mjs (importa a Bíblia) e biblia/sword.mjs (leitor do módulo da CrossWire)
supabase/migrations/   SQL do banco
tests/            banco/ (todas as migrações num Postgres de teste), frontend/ e api/ (função da Vercel com fetch simulado)
```

Para adicionar outros componentes do shadcn/ui: `npx shadcn@latest add <componente>`.

Scripts: `npm run dev` · `npm run build` (verifica tipos e gera `dist/`) · `npm run preview` · `npm test` (testes de segurança e do banco) · `npm run seed:biblia` (importa a Bíblia, uma vez).
