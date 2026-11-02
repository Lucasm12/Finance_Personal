/**
 * Catálogo de treinos de corrida, ciclismo e natação. Cada modelo monta a estrutura
 * (aquecimento, parte principal e desaquecimento) para o nível do atleta; a intensidade
 * de cada passo é uma zona (Z1–Z6), convertida em pace, potência, FC e PSE pelo perfil.
 */
import type { BlocoTreino, FaseBloco, ModalidadeEndurance, NivelForca, ObjetivoEndurance, PassoTreino } from '@/types/triathlon'

export const OBJETIVOS_ENDURANCE: Record<ObjetivoEndurance, string> = {
  resistencia: 'Resistência',
  velocidade: 'Velocidade',
  limiar: 'Limiar',
  recuperacao: 'Recuperação',
  tecnica: 'Técnica',
  subidas: 'Subidas',
}

/** Objetivos que fazem sentido em cada modalidade (na ordem da tela). */
export const OBJETIVOS_POR_MODALIDADE: Record<ModalidadeEndurance, ObjetivoEndurance[]> = {
  corrida: ['resistencia', 'limiar', 'velocidade', 'subidas', 'recuperacao'],
  ciclismo: ['resistencia', 'limiar', 'velocidade', 'subidas', 'tecnica', 'recuperacao'],
  natacao: ['tecnica', 'resistencia', 'limiar', 'velocidade', 'recuperacao'],
}

export interface ModeloEndurance {
  id: string
  modalidade: ModalidadeEndurance
  nome: string
  objetivo: ObjetivoEndurance
  /** para que serve, em uma frase */
  proposito: string
  dica?: string
  niveis: NivelForca[]
  /** treino longo da semana (o app evita repetir dentro de 7 dias) */
  longo?: boolean
  /** treino intenso (o app evita em até 48 h depois de outro) */
  intenso?: boolean
  montar: (nivel: NivelForca) => BlocoTreino[]
}

// -----------------------------------------------------------------------------
// Atalhos para escrever os modelos
// -----------------------------------------------------------------------------

const TODOS: NivelForca[] = ['iniciante', 'intermediario', 'avancado']
const MEIO: NivelForca[] = ['intermediario', 'avancado']

/** Valor por nível. */
const por = <T,>(nivel: NivelForca, valores: Record<NivelForca, T>) => valores[nivel]

const min = (minutos: number, zona: number, descricao?: string, pct?: [number, number]): PassoTreino => ({
  tipo: 'esforco',
  duracao_seg: Math.round(minutos * 60),
  distancia_m: null,
  zona,
  ...(pct ? { pct } : {}),
  ...(descricao ? { descricao } : {}),
})
const seg = (segundos: number, zona: number, descricao?: string): PassoTreino => ({ ...min(segundos / 60, zona, descricao), duracao_seg: segundos })
const m = (metros: number, zona: number, descricao?: string): PassoTreino => ({
  tipo: 'esforco',
  duracao_seg: null,
  distancia_m: metros,
  zona,
  ...(descricao ? { descricao } : {}),
})
/** Recuperação entre tiros (na natação, por tempo = descanso parado). */
const rec = (p: PassoTreino): PassoTreino => ({ ...p, tipo: 'recuperacao' })

const bloco = (fase: FaseBloco, passos: PassoTreino[], repeticoes = 1, descricao?: string): BlocoTreino => ({
  fase,
  repeticoes,
  passos,
  ...(descricao ? { descricao } : {}),
})
const aquec = (passos: PassoTreino[], descricao?: string) => bloco('aquecimento', passos, 1, descricao)
const desaq = (passos: PassoTreino[], descricao?: string) => bloco('desaquecimento', passos, 1, descricao)

// -----------------------------------------------------------------------------
// Corrida
// -----------------------------------------------------------------------------

const CORRIDA: ModeloEndurance[] = [
  {
    id: 'corrida_rodagem_leve',
    modalidade: 'corrida',
    nome: 'Rodagem leve',
    objetivo: 'resistencia',
    proposito: 'Base aeróbica: ritmo em que dá para conversar o tempo todo.',
    dica: 'Se a FC subir demais na subida, diminua o passo ou caminhe um pouco.',
    niveis: TODOS,
    montar: (n) => [
      aquec([min(5, 1, 'trote bem leve ou caminhada rápida')]),
      bloco('principal', [min(por(n, { iniciante: 25, intermediario: 40, avancado: 55 }), 2, 'contínuo, respiração tranquila')]),
      desaq([min(5, 1, 'trote leve e alongamento')]),
    ],
  },
  {
    id: 'corrida_regenerativo',
    modalidade: 'corrida',
    nome: 'Regenerativo',
    objetivo: 'recuperacao',
    proposito: 'Soltar as pernas no dia seguinte a um treino forte ou prova.',
    dica: 'Mais devagar do que parece necessário. Terreno plano e macio, se possível.',
    niveis: TODOS,
    montar: (n) => [bloco('principal', [min(por(n, { iniciante: 20, intermediario: 30, avancado: 40 }), 1, 'trote muito leve')]), desaq([min(5, 1, 'caminhada e mobilidade')])],
  },
  {
    id: 'corrida_intervalado',
    modalidade: 'corrida',
    nome: 'Intervalado',
    objetivo: 'velocidade',
    proposito: 'VO₂máx: tiros fortes com recuperação em trote para subir o teto aeróbico.',
    dica: 'Os tiros devem sair parecidos: se o último for muito mais lento, o ritmo estava alto demais.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(15, 2, 'trote progressivo; no fim, 4 acelerações de 20 s')]),
      n === 'iniciante'
        ? bloco('principal', [min(1, 5, 'forte, controlado'), rec(min(2, 1, 'trote ou caminhada'))], 6)
        : bloco('principal', [m(800, 5, 'forte, ritmo de 3–5 km'), rec(seg(n === 'avancado' ? 90 : 120, 1, 'trote leve'))], n === 'avancado' ? 8 : 6),
      desaq([min(10, 1, 'trote leve')]),
    ],
  },
  {
    id: 'corrida_tempo_run',
    modalidade: 'corrida',
    nome: 'Tempo run',
    objetivo: 'limiar',
    proposito: 'Limiar: ritmo “confortavelmente difícil”, sustentável por cerca de uma hora.',
    dica: 'Respiração forte, mas sob controle; dá para falar frases curtas.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(15, 2, 'trote progressivo')]),
      n === 'iniciante'
        ? bloco('principal', [min(6, 4, 'ritmo de limiar'), rec(min(2, 1, 'trote'))], 3)
        : n === 'intermediario'
          ? bloco('principal', [min(20, 4, 'contínuo no ritmo de limiar')])
          : bloco('principal', [min(15, 4, 'ritmo de limiar'), rec(min(3, 1, 'trote'))], 2),
      desaq([min(10, 1, 'trote leve')]),
    ],
  },
  {
    id: 'corrida_longao',
    modalidade: 'corrida',
    nome: 'Longão',
    objetivo: 'resistencia',
    proposito: 'Resistência: o treino mais longo da semana, em ritmo leve.',
    dica: 'Leve água; acima de 75 min, carboidrato a cada 30–40 min.',
    niveis: TODOS,
    longo: true,
    montar: (n) => [
      aquec([min(10, 1, 'trote leve')]),
      n === 'avancado'
        ? bloco('principal', [min(85, 2, 'contínuo, ritmo leve'), min(15, 3, 'últimos minutos um pouco mais firmes')])
        : bloco('principal', [min(n === 'iniciante' ? 50 : 75, 2, 'contínuo, ritmo leve')]),
      desaq([min(5, 1, 'caminhada')]),
    ],
  },
  {
    id: 'corrida_fartlek',
    modalidade: 'corrida',
    nome: 'Fartlek',
    objetivo: 'velocidade',
    proposito: 'Variação de ritmo sem pista: acelera e solta por tempo.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(10, 2, 'trote')]),
      bloco('principal', [min(1, n === 'iniciante' ? 4 : 5, 'acelerado'), rec(min(n === 'iniciante' ? 2 : 1, 2, 'solto'))], por(n, { iniciante: 6, intermediario: 8, avancado: 10 })),
      desaq([min(10, 1, 'trote leve')]),
    ],
  },
  {
    id: 'corrida_subidas',
    modalidade: 'corrida',
    nome: 'Tiros em subida',
    objetivo: 'subidas',
    proposito: 'Força específica e economia de corrida com pouco impacto.',
    dica: 'Subida de 4–8% de inclinação. Tronco levemente à frente, braços ativos; desça trotando.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(15, 2, 'trote até o pé da subida')]),
      bloco('principal', [seg(60, 5, 'subida forte'), rec(seg(90, 1, 'descida trotando'))], por(n, { iniciante: 6, intermediario: 8, avancado: 10 })),
      desaq([min(10, 1, 'trote no plano')]),
    ],
  },
  {
    id: 'corrida_progressivo',
    modalidade: 'corrida',
    nome: 'Progressivo',
    objetivo: 'limiar',
    proposito: 'Começa leve e termina perto do limiar: ensina a acelerar cansado.',
    niveis: MEIO,
    montar: (n) => [
      aquec([min(10, 1, 'trote leve')]),
      bloco('principal', [min(n === 'avancado' ? 20 : 15, 2, 'leve'), min(n === 'avancado' ? 15 : 10, 3, 'moderado'), min(n === 'avancado' ? 10 : 5, 4, 'ritmo de limiar')]),
      desaq([min(5, 1, 'trote')]),
    ],
  },
]

// -----------------------------------------------------------------------------
// Ciclismo
// -----------------------------------------------------------------------------

const CICLISMO: ModeloEndurance[] = [
  {
    id: 'ciclismo_endurance_z2',
    modalidade: 'ciclismo',
    nome: 'Endurance (Z2)',
    objetivo: 'resistencia',
    proposito: 'Base aeróbica no pedal: muito tempo em Z2 com cadência fluida.',
    dica: 'Cadência entre 85 e 95 rpm. Coma e beba a cada 20–30 min.',
    niveis: TODOS,
    longo: true,
    montar: (n) => [
      aquec([min(10, 1, 'giro leve')]),
      bloco('principal', [min(por(n, { iniciante: 45, intermediario: 75, avancado: 120 }), 2, 'contínuo, 85–95 rpm')]),
      desaq([min(10, 1, 'giro leve')]),
    ],
  },
  {
    id: 'ciclismo_limiar',
    modalidade: 'ciclismo',
    nome: 'Intervalos de limiar',
    objetivo: 'limiar',
    proposito: 'Sobe o FTP: blocos longos logo abaixo do limiar.',
    dica: 'Potência constante do começo ao fim de cada bloco; cadência 85–95 rpm.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(12, 2, 'progressivo'), min(3, 3, 'ativação')]),
      n === 'iniciante'
        ? bloco('principal', [min(8, 4, 'limiar'), rec(min(4, 1, 'giro leve'))], 3)
        : n === 'intermediario'
          ? bloco('principal', [min(20, 4, 'limiar'), rec(min(5, 1, 'giro leve'))], 2)
          : bloco('principal', [min(15, 4, 'limiar'), rec(min(5, 1, 'giro leve'))], 3),
      desaq([min(10, 1, 'giro leve')]),
    ],
  },
  {
    id: 'ciclismo_sweet_spot',
    modalidade: 'ciclismo',
    nome: 'Sweet spot',
    objetivo: 'limiar',
    proposito: 'Entre o tempo e o limiar (88–94% do FTP): muito estímulo com fadiga controlada.',
    niveis: MEIO,
    intenso: true,
    montar: (n) => [
      aquec([min(15, 2, 'progressivo')]),
      bloco('principal', [min(n === 'avancado' ? 15 : 12, 4, 'sweet spot', [0.88, 0.94]), rec(min(4, 1, 'giro leve'))], 3),
      desaq([min(10, 1, 'giro leve')]),
    ],
  },
  {
    id: 'ciclismo_vo2',
    modalidade: 'ciclismo',
    nome: 'VO₂máx',
    objetivo: 'velocidade',
    proposito: 'Tiros de 3–4 min bem fortes para subir a potência aeróbica máxima.',
    dica: 'Comece o tiro forte, mas sem explodir no primeiro minuto.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(15, 2, 'progressivo, com 2 acelerações de 30 s')]),
      n === 'iniciante'
        ? bloco('principal', [min(3, 5, 'forte'), rec(min(3, 1, 'giro leve'))], 4)
        : bloco('principal', [min(4, 5, 'forte'), rec(min(n === 'avancado' ? 3 : 4, 1, 'giro leve'))], n === 'avancado' ? 6 : 5),
      desaq([min(10, 1, 'giro leve')]),
    ],
  },
  {
    id: 'ciclismo_subidas',
    modalidade: 'ciclismo',
    nome: 'Subidas',
    objetivo: 'subidas',
    proposito: 'Força no pedal: blocos em subida (ou carga alta no rolo) com cadência baixa.',
    dica: 'Sentado, cadência 60–70 rpm, tronco estável. No rolo, aumente a resistência.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([min(15, 2, 'giro leve até a subida')]),
      bloco('principal', [min(5, 4, 'subida, 60–70 rpm sentado'), rec(min(4, 1, 'descida / giro leve'))], por(n, { iniciante: 4, intermediario: 6, avancado: 8 })),
      desaq([min(10, 1, 'giro leve')]),
    ],
  },
  {
    id: 'ciclismo_recuperacao',
    modalidade: 'ciclismo',
    nome: 'Recuperação ativa',
    objetivo: 'recuperacao',
    proposito: 'Circular o sangue e soltar as pernas sem gerar fadiga.',
    dica: 'Marcha leve, cadência acima de 90 rpm. Se sentir as pernas pesando, encurte.',
    niveis: TODOS,
    montar: (n) => [bloco('principal', [min(por(n, { iniciante: 30, intermediario: 40, avancado: 45 }), 1, 'giro leve, 90+ rpm')])],
  },
  {
    id: 'ciclismo_cadencia',
    modalidade: 'ciclismo',
    nome: 'Cadência e técnica',
    objetivo: 'tecnica',
    proposito: 'Pedalada redonda e eficiente: blocos de cadência alta sem subir a potência.',
    niveis: TODOS,
    montar: (n) => [
      aquec([min(10, 1, 'giro leve')]),
      bloco('principal', [min(1, 2, 'cadência alta: 105–115 rpm, quadril parado'), rec(min(2, 2, 'cadência normal'))], por(n, { iniciante: 5, intermediario: 8, avancado: 10 })),
      bloco('principal', [min(por(n, { iniciante: 10, intermediario: 15, avancado: 20 }), 2, 'contínuo, 90 rpm')]),
      desaq([min(5, 1, 'giro leve')]),
    ],
  },
]

// -----------------------------------------------------------------------------
// Natação (descanso entre as repetições = parado na borda)
// -----------------------------------------------------------------------------

const NATACAO: ModeloEndurance[] = [
  {
    id: 'natacao_tecnica',
    modalidade: 'natacao',
    nome: 'Técnica e educativos',
    objetivo: 'tecnica',
    proposito: 'Eficiência na água: educativos para a braçada, a respiração e a posição do corpo.',
    dica: 'Educativos: punho fechado, polo aquático, braçada com pausa à frente (catch-up), 6 pernadas por braçada.',
    niveis: TODOS,
    montar: (n) => [
      aquec([m(por(n, { iniciante: 200, intermediario: 300, avancado: 400 }), 1, 'livre, solto')]),
      bloco('principal', [m(50, 2, 'educativo (alterne a cada 50 m)'), rec(seg(20, 1))], por(n, { iniciante: 6, intermediario: 8, avancado: 10 })),
      bloco('principal', [m(100, 2, 'crawl aplicando a técnica'), rec(seg(20, 1))], por(n, { iniciante: 3, intermediario: 4, avancado: 6 })),
      desaq([m(100, 1, 'solto, costas ou peito')]),
    ],
  },
  {
    id: 'natacao_aerobico',
    modalidade: 'natacao',
    nome: 'Série aeróbica',
    objetivo: 'resistencia',
    proposito: 'Resistência na água: repetições médias com descanso curto.',
    niveis: TODOS,
    montar: (n) => [
      aquec([m(300, 1, 'livre, solto'), m(200, 2, '4× 50 m pernada + braçada')]),
      n === 'iniciante'
        ? bloco('principal', [m(100, 2, 'ritmo constante'), rec(seg(20, 1))], 6)
        : n === 'intermediario'
          ? bloco('principal', [m(100, 3, 'ritmo constante'), rec(seg(15, 1))], 10)
          : bloco('principal', [m(300, 3, 'ritmo constante, respiração bilateral'), rec(seg(20, 1))], 5),
      desaq([m(200, 1, 'solto')]),
    ],
  },
  {
    id: 'natacao_css',
    modalidade: 'natacao',
    nome: 'Limiar (CSS)',
    objetivo: 'limiar',
    proposito: 'Nadar no ritmo de limiar (CSS) com descanso curto: o treino-chave do triatleta.',
    dica: 'Sem CSS no perfil? Faça o teste de 400 m e 200 m e cadastre no Perfil do atleta.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([m(300, 1, 'livre, solto'), m(100, 3, '4× 25 m progressivo')]),
      bloco('principal', [m(100, 4, 'ritmo de CSS'), rec(seg(por(n, { iniciante: 20, intermediario: 15, avancado: 10 }), 1))], por(n, { iniciante: 6, intermediario: 10, avancado: 12 })),
      desaq([m(200, 1, 'solto')]),
    ],
  },
  {
    id: 'natacao_velocidade',
    modalidade: 'natacao',
    nome: 'Tiros de velocidade',
    objetivo: 'velocidade',
    proposito: 'Velocidade e potência de braçada: tiros curtos e fortes com descanso longo.',
    niveis: TODOS,
    intenso: true,
    montar: (n) => [
      aquec([m(300, 1, 'livre, solto'), m(100, 3, '4× 25 m progressivo')]),
      bloco('principal', [m(25, 6, 'máximo'), rec(seg(n === 'iniciante' ? 40 : 30, 1))], por(n, { iniciante: 8, intermediario: 12, avancado: 16 })),
      ...(n === 'iniciante' ? [] : [bloco('principal', [m(50, 5, 'forte, braçada longa'), rec(seg(45, 1))], n === 'avancado' ? 6 : 4)]),
      desaq([m(200, 1, 'solto')]),
    ],
  },
  {
    id: 'natacao_continuo',
    modalidade: 'natacao',
    nome: 'Nado contínuo',
    objetivo: 'resistencia',
    proposito: 'Nadar sem parar, como na prova: ritmo e respiração constantes.',
    dica: 'Respiração bilateral; a cada 100 m, levante a cabeça para “avistar” como em águas abertas.',
    niveis: TODOS,
    longo: true,
    montar: (n) => [
      aquec([m(200, 1, 'solto')]),
      bloco('principal', [m(por(n, { iniciante: 800, intermediario: 1500, avancado: 2500 }), 2, 'contínuo, ritmo constante')]),
      desaq([m(100, 1, 'solto')]),
    ],
  },
  {
    id: 'natacao_piramide',
    modalidade: 'natacao',
    nome: 'Pirâmide',
    objetivo: 'limiar',
    proposito: 'Distâncias que sobem e descem perto do limiar: ritmo sob fadiga.',
    niveis: MEIO,
    intenso: true,
    montar: (n) => {
      const k = n === 'avancado' ? 2 : 1
      return [
        aquec([m(300, 1, 'livre, solto')]),
        ...[100, 200, 300, 200, 100].map((d) => bloco('principal', [m(d * k, d === 300 ? 3 : 4, 'ritmo forte e constante'), rec(seg(20, 1))])),
        desaq([m(200, 1, 'solto')]),
      ]
    },
  },
  {
    id: 'natacao_recuperacao',
    modalidade: 'natacao',
    nome: 'Recuperação',
    objetivo: 'recuperacao',
    proposito: 'Nado leve e variado para soltar ombros e costas.',
    niveis: TODOS,
    montar: (n) => [
      bloco('principal', [m(100, 1, 'alterne crawl, costas e peito'), rec(seg(15, 1))], por(n, { iniciante: 6, intermediario: 10, avancado: 12 })),
      desaq([m(100, 1, 'pernada com prancha')]),
    ],
  },
]

export const CATALOGO: ModeloEndurance[] = [...CORRIDA, ...CICLISMO, ...NATACAO]
export const MODELO_POR_ID = new Map(CATALOGO.map((x) => [x.id, x]))
