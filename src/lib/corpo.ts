/**
 * Composição corporal: IMC, % de gordura, índices de cintura, peso de referência,
 * gasto energético e tendência do peso. As faixas valem para adultos.
 */
import { dataLocal, diasEntre, idade, somarDias } from '@/lib/triathlon'
import type { Modalidade, PerfilAtleta, Pesagem, Treino } from '@/types/triathlon'

export type Sexo = 'M' | 'F'

// -----------------------------------------------------------------------------
// Escalas de referência
// -----------------------------------------------------------------------------

/** Estado de uma faixa (vira cor de status + rótulo na tela, nunca só cor). */
export type Tom = 'bom' | 'neutro' | 'atencao' | 'alerta' | 'perigo'

export interface Faixa {
  rotulo: string
  /** limite inferior (inclusive) */
  de: number
  /** limite superior (exclusivo) */
  ate: number
  tom: Tom
}

export interface Escala {
  nome: string
  unidade: string
  /** casas decimais usadas para arredondar o valor e escrever as faixas */
  casas: number
  /** trecho desenhado na régua */
  min: number
  max: number
  faixas: Faixa[]
  fonte: string
}

export interface Leitura {
  valor: number
  faixa: Faixa
  escala: Escala
}

const f = (rotulo: string, de: number, ate: number, tom: Tom): Faixa => ({ rotulo, de, ate, tom })
const INF = Number.POSITIVE_INFINITY

/** Classifica com o valor arredondado como aparece na tela (24,96 → 25,0 → sobrepeso). */
export function classificar(valor: number, escala: Escala): Leitura {
  const v = Number(valor.toFixed(escala.casas))
  const faixa =
    escala.faixas.find((x) => v >= x.de && v < x.ate) ?? (v < escala.faixas[0].de ? escala.faixas[0] : escala.faixas.at(-1)!)
  return { valor: v, faixa, escala }
}

const numeroCom = (casas: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const formatarValor = (valor: number, escala: Pick<Escala, 'casas'>) => numeroCom(escala.casas).format(valor)

/** Faixa por extenso: "< 16,0", "18,5 – 24,9", "≥ 40,0". */
export function textoFaixa(x: Faixa, escala: Escala): string {
  const fmt = numeroCom(escala.casas)
  if (x.de === -INF) return `< ${fmt.format(x.ate)}`
  if (x.ate === INF) return `≥ ${fmt.format(x.de)}`
  return `${fmt.format(x.de)} – ${fmt.format(x.ate - 10 ** -escala.casas)}`
}

export const ESCALA_IMC: Escala = {
  nome: 'IMC',
  unidade: 'kg/m²',
  casas: 1,
  min: 14,
  max: 42,
  fonte: 'Organização Mundial da Saúde (adultos de 20 a 59 anos)',
  faixas: [
    f('Magreza grave', -INF, 16, 'perigo'),
    f('Magreza moderada', 16, 17, 'alerta'),
    f('Magreza leve', 17, 18.5, 'atencao'),
    f('Peso normal', 18.5, 25, 'bom'),
    f('Sobrepeso', 25, 30, 'atencao'),
    f('Obesidade grau I', 30, 35, 'alerta'),
    f('Obesidade grau II', 35, 40, 'perigo'),
    f('Obesidade grau III', 40, INF, 'perigo'),
  ],
}

export const ESCALA_IMC_IDOSO: Escala = {
  nome: 'IMC (60 anos ou mais)',
  unidade: 'kg/m²',
  casas: 1,
  min: 16,
  max: 34,
  fonte: 'Lipschitz (1994), adotado pelo Ministério da Saúde',
  faixas: [f('Baixo peso', -INF, 22, 'atencao'), f('Adequado', 22, 27.1, 'bom'), f('Sobrepeso', 27.1, INF, 'atencao')],
}

export function escalaGordura(sexo: Sexo): Escala {
  const [essencial, atleta, forma, media, obesidade] = sexo === 'M' ? [2, 6, 14, 18, 25] : [10, 14, 21, 25, 32]
  return {
    nome: '% de gordura',
    unidade: '%',
    casas: 1,
    min: sexo === 'M' ? 0 : 6,
    max: sexo === 'M' ? 38 : 46,
    fonte: 'American Council on Exercise (ACE)',
    faixas: [
      f('Abaixo do essencial', -INF, essencial, 'perigo'),
      f('Gordura essencial', essencial, atleta, 'atencao'),
      f('Atleta', atleta, forma, 'bom'),
      f('Boa forma', forma, media, 'bom'),
      f('Média', media, obesidade, 'neutro'),
      f('Obesidade', obesidade, INF, 'alerta'),
    ],
  }
}

export function escalaCintura(sexo: Sexo): Escala {
  const [aumentado, muito] = sexo === 'M' ? [94, 102] : [80, 88]
  return {
    nome: 'Circunferência da cintura',
    unidade: 'cm',
    casas: 0,
    min: sexo === 'M' ? 65 : 55,
    max: sexo === 'M' ? 125 : 115,
    fonte: 'OMS — risco cardiometabólico',
    faixas: [
      f('Adequada', -INF, aumentado, 'bom'),
      f('Risco aumentado', aumentado, muito, 'atencao'),
      f('Risco muito aumentado', muito, INF, 'alerta'),
    ],
  }
}

export function escalaRcq(sexo: Sexo): Escala {
  const corte = sexo === 'M' ? 0.9 : 0.85
  return {
    nome: 'Relação cintura/quadril',
    unidade: '',
    casas: 2,
    min: 0.65,
    max: 1.15,
    fonte: 'OMS (2008)',
    faixas: [f('Adequada', -INF, corte, 'bom'), f('Risco aumentado', corte, INF, 'alerta')],
  }
}

export const ESCALA_RCEST: Escala = {
  nome: 'Relação cintura/altura',
  unidade: '',
  casas: 2,
  min: 0.3,
  max: 0.75,
  fonte: 'Ashwell — “mantenha a cintura menor que metade da altura”',
  faixas: [
    f('Abaixo do esperado', -INF, 0.4, 'atencao'),
    f('Saudável', 0.4, 0.5, 'bom'),
    f('Risco aumentado', 0.5, 0.6, 'atencao'),
    f('Risco alto', 0.6, INF, 'alerta'),
  ],
}

export const ESCALA_VISCERAL: Escala = {
  nome: 'Gordura visceral',
  unidade: 'nível',
  casas: 0,
  min: 1,
  max: 25,
  fonte: 'escala das balanças de bioimpedância (1 a 59)',
  faixas: [f('Saudável', -INF, 10, 'bom'), f('Alta', 10, 15, 'atencao'), f('Muito alta', 15, INF, 'alerta')],
}

export function escalaAgua(sexo: Sexo): Escala {
  const [de, ate] = sexo === 'M' ? [50, 66] : [45, 61]
  return {
    nome: 'Água corporal',
    unidade: '%',
    casas: 1,
    min: 38,
    max: 72,
    fonte: 'referência usual das balanças de bioimpedância',
    faixas: [f('Baixa', -INF, de, 'atencao'), f('Adequada', de, ate, 'bom'), f('Alta', ate, INF, 'neutro')],
  }
}

/** Índice de massa livre de gordura, normalizado para 1,80 m. Referência aproximada. */
export function escalaFfmi(sexo: Sexo): Escala {
  const [media, acima, muito, excepcional] = sexo === 'M' ? [18, 20, 22, 25] : [15, 17, 19, 21]
  return {
    nome: 'FFMI',
    unidade: 'kg/m²',
    casas: 1,
    min: sexo === 'M' ? 15 : 12,
    max: sexo === 'M' ? 27 : 23,
    fonte: 'Kouri et al. (1995), valores aproximados',
    faixas: [
      f('Abaixo da média', -INF, media, 'neutro'),
      f('Média', media, acima, 'neutro'),
      f('Acima da média', acima, muito, 'bom'),
      f('Muito alto', muito, excepcional, 'bom'),
      f('Excepcional', excepcional, INF, 'neutro'),
    ],
  }
}

// -----------------------------------------------------------------------------
// Fórmulas
// -----------------------------------------------------------------------------

export const imcDe = (pesoKg: number, alturaCm: number) => pesoKg / (alturaCm / 100) ** 2
export const pesoParaImc = (imc: number, alturaCm: number) => imc * (alturaCm / 100) ** 2

/** % de gordura pelo método da Marinha dos EUA (Hodgdon & Beckett), em cm. */
export function gorduraMarinha(sexo: Sexo, alturaCm: number, cintura: number, pescoco: number, quadril: number | null): number | null {
  let pct: number
  if (sexo === 'M') {
    if (cintura - pescoco <= 0) return null
    pct = 495 / (1.0324 - 0.19077 * Math.log10(cintura - pescoco) + 0.15456 * Math.log10(alturaCm)) - 450
  } else {
    if (!quadril || cintura + quadril - pescoco <= 0) return null
    pct = 495 / (1.29579 - 0.35004 * Math.log10(cintura + quadril - pescoco) + 0.221 * Math.log10(alturaCm)) - 450
  }
  return pct >= 2 && pct <= 60 ? pct : null
}

/** % de gordura estimada só pelo IMC (Deurenberg, 1991). Superestima em quem tem muita massa muscular. */
export const gorduraDeurenberg = (imc: number, anos: number, sexo: Sexo) => 1.2 * imc + 0.23 * anos - 10.8 * (sexo === 'M' ? 1 : 0) - 5.4

export interface Formula {
  nome: string
  detalhe: string
  valor: number
}

/** Taxa metabólica basal (kcal/dia) por várias fórmulas; as de massa magra só com % de gordura. */
export function taxasBasais(pesoKg: number, alturaCm: number, anos: number, sexo: Sexo, massaMagra: number | null): Formula[] {
  const m = sexo === 'M'
  const lista: Formula[] = [
    {
      nome: 'Mifflin-St Jeor',
      detalhe: 'a mais usada hoje para adultos',
      valor: 10 * pesoKg + 6.25 * alturaCm - 5 * anos + (m ? 5 : -161),
    },
    {
      nome: 'Harris-Benedict',
      detalhe: 'revisada por Roza e Shizgal (1984)',
      valor: m
        ? 88.362 + 13.397 * pesoKg + 4.799 * alturaCm - 5.677 * anos
        : 447.593 + 9.247 * pesoKg + 3.098 * alturaCm - 4.33 * anos,
    },
  ]
  if (massaMagra) {
    lista.push(
      { nome: 'Katch-McArdle', detalhe: 'usa a massa magra', valor: 370 + 21.6 * massaMagra },
      { nome: 'Cunningham', detalhe: 'massa magra — indicada para atletas', valor: 500 + 22 * massaMagra },
    )
  }
  return lista.map((x) => ({ ...x, valor: Math.round(x.valor) }))
}

/** Peso “ideal” pelas fórmulas clássicas (altura em polegadas acima de 5 pés). */
export function pesosIdeais(alturaCm: number, sexo: Sexo): Formula[] {
  const pol = alturaCm / 2.54 - 60
  const m = sexo === 'M'
  return [
    { nome: 'Devine', detalhe: '1974', valor: (m ? 50 : 45.5) + 2.3 * pol },
    { nome: 'Robinson', detalhe: '1983', valor: m ? 52 + 1.9 * pol : 49 + 1.7 * pol },
    { nome: 'Miller', detalhe: '1983', valor: m ? 56.2 + 1.41 * pol : 53.1 + 1.36 * pol },
    { nome: 'Hamwi', detalhe: '1964', valor: m ? 48 + 2.7 * pol : 45.5 + 2.2 * pol },
  ]
}

/** Alvos de % de gordura para calcular o peso mantendo a massa magra. */
export const ALVOS_GORDURA: Record<Sexo, number[]> = { M: [8, 10, 12, 15], F: [16, 18, 21, 24] }

// -----------------------------------------------------------------------------
// Energia gasta nos treinos e necessidades diárias
// -----------------------------------------------------------------------------

/** MET médio por modalidade, usado quando o treino não tem calorias, potência nem distância. */
const MET: Record<Modalidade, number> = { natacao: 7, ciclismo: 7.5, corrida: 9.5, forca: 5, outro: 5 }

/** kcal de um treino: a registrada; senão potência (kJ ≈ kcal), corrida (≈ 1 kcal/kg/km) ou MET. */
export function kcalTreino(t: Treino, pesoKg: number): { kcal: number; estimado: boolean } {
  if (t.calorias) return { kcal: t.calorias, estimado: false }
  if (t.modalidade === 'ciclismo' && t.potencia_media) {
    return { kcal: Math.round((t.potencia_media * t.duracao_seg) / 1000), estimado: true }
  }
  if (t.modalidade === 'corrida' && t.distancia_m) return { kcal: Math.round((pesoKg * t.distancia_m) / 1000), estimado: true }
  return { kcal: Math.round((MET[t.modalidade] * pesoKg * t.duracao_seg) / 3600), estimado: true }
}

export interface GastoTreinos {
  kcalDia: number
  horasDia: number
  quantidade: number
  estimados: number
  dias: number
}

/** Média diária de kcal e horas de treino nos últimos `dias` dias (até hoje). */
export function gastoTreinos(treinos: Treino[], pesoKg: number, dias = 28, hoje = dataLocal(new Date())): GastoTreinos {
  const inicio = somarDias(hoje, -(dias - 1))
  let kcal = 0
  let segundos = 0
  let quantidade = 0
  let estimados = 0
  for (const t of treinos) {
    const dia = dataLocal(t.data_hora)
    if (dia < inicio || dia > hoje) continue
    const k = kcalTreino(t, pesoKg)
    kcal += k.kcal
    segundos += t.duracao_seg
    quantidade++
    if (k.estimado) estimados++
  }
  return { kcalDia: Math.round(kcal / dias), horasDia: segundos / 3600 / dias, quantidade, estimados, dias }
}

/** Carboidrato recomendado (g/kg/dia) pelo volume de treino — consenso ACSM/IOC. */
export function carboPorKg(horasDia: number): { de: number; ate: number; nivel: string } {
  if (horasDia < 0.5) return { de: 3, ate: 5, nivel: 'treino leve' }
  if (horasDia < 1.5) return { de: 5, ate: 7, nivel: 'cerca de 1 h por dia' }
  if (horasDia < 3) return { de: 6, ate: 10, nivel: '1 a 3 h por dia' }
  return { de: 8, ate: 12, nivel: 'mais de 3 h por dia' }
}

// -----------------------------------------------------------------------------
// Tendência do peso
// -----------------------------------------------------------------------------

export interface Tendencia {
  kgSemana: number
  /** % do peso por semana */
  pctSemana: number
  pontos: number
  dias: number
}

/** Inclinação (regressão linear) do peso nos últimos `dias` dias. Precisa de 3 pesagens cobrindo 7 dias. */
export function tendenciaPeso(pesagens: Pesagem[], dias = 28): Tendencia | null {
  const ultima = pesagens.at(-1)
  if (!ultima) return null
  const inicio = somarDias(ultima.data, -dias)
  const pts = pesagens.filter((p) => p.data >= inicio).map((p) => [diasEntre(inicio, p.data), p.peso_kg] as const)
  if (pts.length < 3 || pts.at(-1)![0] - pts[0][0] < 7) return null
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length
  let sxy = 0
  let sxx = 0
  for (const [x, y] of pts) {
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) ** 2
  }
  const kgSemana = (sxy / sxx) * 7
  return { kgSemana, pctSemana: (kgSemana / my) * 100, pontos: pts.length, dias }
}

export function lerTendencia(t: Tendencia): { rotulo: string; descricao: string; tom: Tom } {
  const p = t.pctSemana
  if (Math.abs(p) < 0.2) return { rotulo: 'Estável', descricao: 'Peso praticamente igual nas últimas semanas.', tom: 'bom' }
  if (p <= -1) {
    return { rotulo: 'Perdendo rápido', descricao: 'Mais de 1% do peso por semana pode custar massa muscular e desempenho.', tom: 'atencao' }
  }
  if (p < 0) return { rotulo: 'Perdendo', descricao: 'Ritmo sustentável (até 1% do peso por semana).', tom: 'bom' }
  if (p >= 0.5) return { rotulo: 'Ganhando rápido', descricao: 'Acima de 0,5% por semana costuma vir mais gordura que músculo.', tom: 'atencao' }
  return { rotulo: 'Ganhando', descricao: 'Ganho lento, compatível com ganho de massa magra.', tom: 'neutro' }
}

/** Data prevista para chegar à meta no ritmo atual (null se o ritmo não leva até ela em 2 anos). */
export function previsaoMeta(pesoAtual: number, meta: number, kgSemana: number, hoje = dataLocal(new Date())) {
  const falta = meta - pesoAtual
  if (Math.abs(falta) < 0.1 || kgSemana === 0 || Math.sign(falta) !== Math.sign(kgSemana)) return null
  const semanas = falta / kgSemana
  if (semanas > 104) return null
  return { semanas, data: somarDias(hoje, Math.round(semanas * 7)) }
}

// -----------------------------------------------------------------------------
// Avaliação completa
// -----------------------------------------------------------------------------

type CampoMedida =
  | 'gordura_pct'
  | 'massa_muscular_kg'
  | 'agua_pct'
  | 'gordura_visceral'
  | 'massa_ossea_kg'
  | 'cintura_cm'
  | 'quadril_cm'
  | 'pescoco_cm'
  | 'braco_cm'
  | 'coxa_cm'

export interface ValorData {
  valor: number
  data: string
}

/** Valor mais recente de um campo (medidas não são feitas toda vez que se pesa). */
export function ultimo(pesagens: Pesagem[], campo: CampoMedida): ValorData | null {
  for (let i = pesagens.length - 1; i >= 0; i--) {
    const v = pesagens[i][campo]
    if (v !== null && v !== undefined) return { valor: v, data: pesagens[i].data }
  }
  return null
}

export interface EstimativaGordura {
  pct: number
  metodo: string
  detalhe: string
}

export interface Avaliacao {
  atual: Pesagem
  media7: number
  minimo: Pesagem
  maximo: Pesagem
  primeira: Pesagem
  alturaCm: number | null
  sexo: Sexo | null
  anos: number | null
  imc: Leitura | null
  imcIdoso: Leitura | null
  faixaSaudavel: [number, number] | null
  estimativas: EstimativaGordura[]
  gordura: (Leitura & { estimativa: EstimativaGordura }) | null
  massaGorda: number | null
  massaMagra: number | null
  ffmi: Leitura | null
  cintura: (Leitura & { data: string }) | null
  rcq: (Leitura & { data: string }) | null
  rcest: (Leitura & { data: string }) | null
  visceral: (Leitura & { data: string }) | null
  agua: (Leitura & { data: string }) | null
  musculo: ValorData | null
  osso: ValorData | null
  tendencia: Tendencia | null
}

const comData = (l: Leitura, data: string) => ({ ...l, data })

/** Junta tudo o que dá para calcular com as pesagens (em ordem de data) e o perfil. */
export function avaliarCorpo(pesagens: Pesagem[], perfil: PerfilAtleta | null | undefined): Avaliacao | null {
  const atual = pesagens.at(-1)
  if (!atual) return null
  const alturaCm = perfil?.altura_cm ?? null
  const sexo = perfil?.sexo ?? null
  const anos = idade(perfil?.data_nascimento ?? null)
  const peso = atual.peso_kg

  const janela = pesagens.filter((p) => p.data >= somarDias(atual.data, -6))
  const media7 = janela.reduce((s, p) => s + p.peso_kg, 0) / janela.length
  const minimo = pesagens.reduce((a, b) => (b.peso_kg < a.peso_kg ? b : a))
  const maximo = pesagens.reduce((a, b) => (b.peso_kg > a.peso_kg ? b : a))

  const imcValor = alturaCm ? imcDe(peso, alturaCm) : null
  const imc = imcValor ? classificar(imcValor, ESCALA_IMC) : null
  const imcIdoso = imcValor && anos !== null && anos >= 60 ? classificar(imcValor, ESCALA_IMC_IDOSO) : null
  const faixaSaudavel: [number, number] | null = alturaCm ? [pesoParaImc(18.5, alturaCm), pesoParaImc(24.9, alturaCm)] : null

  const cintura = ultimo(pesagens, 'cintura_cm')
  const quadril = ultimo(pesagens, 'quadril_cm')
  const pescoco = ultimo(pesagens, 'pescoco_cm')

  // % de gordura: medida na balança > método da Marinha (medidas) > estimativa pelo IMC
  const estimativas: EstimativaGordura[] = []
  const medida = ultimo(pesagens, 'gordura_pct')
  if (medida) {
    estimativas.push({ pct: medida.valor, metodo: 'Balança / avaliação', detalhe: `medido em ${dataCurta(medida.data)}` })
  }
  if (sexo && alturaCm && cintura && pescoco) {
    const pct = gorduraMarinha(sexo, alturaCm, cintura.valor, pescoco.valor, quadril?.valor ?? null)
    if (pct !== null) {
      estimativas.push({
        pct,
        metodo: 'Marinha dos EUA',
        detalhe: `cintura e pescoço${sexo === 'F' ? ' e quadril' : ''} de ${dataCurta(cintura.data)}`,
      })
    }
  }
  if (sexo && imcValor && anos !== null && anos >= 18) {
    estimativas.push({ pct: gorduraDeurenberg(imcValor, anos, sexo), metodo: 'Pelo IMC', detalhe: 'Deurenberg — menos preciso em atletas' })
  }
  const principal = estimativas[0] ?? null
  const gordura = principal && sexo ? { ...classificar(principal.pct, escalaGordura(sexo)), estimativa: principal } : null
  const massaGorda = principal ? (peso * principal.pct) / 100 : null
  const massaMagra = massaGorda !== null ? peso - massaGorda : null
  const ffmi =
    massaMagra !== null && alturaCm && sexo
      ? classificar(massaMagra / (alturaCm / 100) ** 2 + 6.1 * (1.8 - alturaCm / 100), escalaFfmi(sexo))
      : null

  const visceral = ultimo(pesagens, 'gordura_visceral')
  const agua = ultimo(pesagens, 'agua_pct')

  return {
    atual,
    media7,
    minimo,
    maximo,
    primeira: pesagens[0],
    alturaCm,
    sexo,
    anos,
    imc,
    imcIdoso,
    faixaSaudavel,
    estimativas,
    gordura,
    massaGorda,
    massaMagra,
    ffmi,
    cintura: cintura && sexo ? comData(classificar(cintura.valor, escalaCintura(sexo)), cintura.data) : null,
    rcq: cintura && quadril && sexo ? comData(classificar(cintura.valor / quadril.valor, escalaRcq(sexo)), cintura.data) : null,
    rcest: cintura && alturaCm ? comData(classificar(cintura.valor / alturaCm, ESCALA_RCEST), cintura.data) : null,
    visceral: visceral ? comData(classificar(visceral.valor, ESCALA_VISCERAL), visceral.data) : null,
    agua: agua && sexo ? comData(classificar(agua.valor, escalaAgua(sexo)), agua.data) : null,
    musculo: ultimo(pesagens, 'massa_muscular_kg'),
    osso: ultimo(pesagens, 'massa_ossea_kg'),
    tendencia: tendenciaPeso(pesagens),
  }
}

/** "2026-10-27" → "27/10/2026" */
export const dataCurta = (data: string) => data.split('-').reverse().join('/')

/** % de gordura de uma pesagem: a medida ou, se houver as medidas do dia, a da Marinha. */
export function gorduraDaPesagem(p: Pesagem, sexo: Sexo | null, alturaCm: number | null): { pct: number; medida: boolean } | null {
  if (p.gordura_pct !== null) return { pct: p.gordura_pct, medida: true }
  if (!sexo || !alturaCm || p.cintura_cm === null || p.pescoco_cm === null) return null
  const pct = gorduraMarinha(sexo, alturaCm, p.cintura_cm, p.pescoco_cm, p.quadril_cm)
  return pct === null ? null : { pct, medida: false }
}

// -----------------------------------------------------------------------------
// Plano de peso: meta semanal até o peso objetivo
// -----------------------------------------------------------------------------

/** kcal em 1 kg de peso corporal perdido ou ganho (regra prática). */
export const KCAL_POR_KG = 7700

/** Média das pesagens dos 7 dias que terminam em `data` (null se não houver nenhuma). */
export function mediaEm(pesagens: Pesagem[], data: string, janela = 7): number | null {
  const inicio = somarDias(data, -(janela - 1))
  const lista = pesagens.filter((p) => p.data >= inicio && p.data <= data)
  return lista.length ? lista.reduce((s, p) => s + p.peso_kg, 0) / lista.length : null
}

export interface Plano {
  inicio: string
  pesoInicial: number
  meta: number
  /** kg por semana (sempre positivo) */
  ritmo: number
  /** −1 = perder, +1 = ganhar */
  sentido: -1 | 1
  /** semanas do início até a meta */
  semanas: number
  /** data em que o plano chega na meta */
  fim: string
}

export function montarPlano(inicio: string, pesoInicial: number, meta: number, ritmo: number): Plano | null {
  const falta = meta - pesoInicial
  if (Math.abs(falta) < 0.1 || !(ritmo > 0)) return null
  const semanas = Math.abs(falta) / ritmo
  return { inicio, pesoInicial, meta, ritmo, sentido: falta < 0 ? -1 : 1, semanas, fim: somarDias(inicio, Math.ceil(semanas * 7)) }
}

/** Plano salvo no perfil (null se faltar meta, ritmo ou início). */
export function planoDoPerfil(perfil: PerfilAtleta | null | undefined): Plano | null {
  if (!perfil?.peso_meta_kg || !perfil.meta_semanal_kg || !perfil.meta_inicio || !perfil.meta_peso_inicial_kg) return null
  return montarPlano(perfil.meta_inicio, perfil.meta_peso_inicial_kg, perfil.peso_meta_kg, perfil.meta_semanal_kg)
}

/** Peso que o plano prevê para uma data (para na meta depois de chegar). */
export function pesoPlanejado(p: Plano, data: string): number {
  const v = p.pesoInicial + (p.sentido * p.ritmo * Math.max(0, diasEntre(p.inicio, data))) / 7
  return p.sentido < 0 ? Math.max(v, p.meta) : Math.min(v, p.meta)
}

/** Semana do plano em que a data cai (1 = os 7 primeiros dias). */
export const semanaDoPlano = (p: Plano, data: string) => Math.max(1, Math.ceil(diasEntre(p.inicio, data) / 7))

export type SituacaoSemana = 'cumprida' | 'nao_cumprida' | 'atual' | 'futura' | 'sem_pesagem'

export interface SemanaPlano {
  numero: number
  /** primeiro e último dia da semana */
  de: string
  ate: string
  /** média planejada para a semana (nas semanas passadas, só nos dias em que houve pesagem) */
  meta: number
  /** média das pesagens da semana (na semana atual, até hoje) */
  real: number | null
  situacao: SituacaoSemana
}

/** Média planejada nos 7 dias que terminam em `data`. */
export function mediaPlanejada(p: Plano, data: string): number {
  let soma = 0
  for (let i = 0; i < 7; i++) soma += pesoPlanejado(p, somarDias(data, -i))
  return soma / 7
}

/**
 * Média real × média do plano nos mesmos dias em que houve pesagem.
 * Comparar a média de 7 dias com o peso planejado de um único dia daria um atraso de ~3 dias.
 */
function compararNoPeriodo(p: Plano, pesagens: Pesagem[], de: string, ate: string) {
  const lista = pesagens.filter((x) => x.data >= de && x.data <= ate)
  if (!lista.length) return null
  return {
    real: lista.reduce((s, x) => s + x.peso_kg, 0) / lista.length,
    plano: lista.reduce((s, x) => s + pesoPlanejado(p, x.data), 0) / lista.length,
  }
}

/** Cada semana do plano com a meta e o que aconteceu de fato. */
export function semanasDoPlano(p: Plano, pesagens: Pesagem[], hoje = dataLocal(new Date())): SemanaPlano[] {
  const atual = semanaDoPlano(p, hoje)
  const total = Math.min(Math.ceil(p.semanas), 156)
  const lista: SemanaPlano[] = []
  for (let n = 1; n <= total; n++) {
    const de = somarDias(p.inicio, 7 * (n - 1) + 1)
    const ate = somarDias(p.inicio, 7 * n)
    const metaSemana = mediaPlanejada(p, ate)
    if (n > atual) {
      lista.push({ numero: n, de, ate, meta: metaSemana, real: null, situacao: 'futura' })
      continue
    }
    if (n === atual) {
      const c = compararNoPeriodo(p, pesagens, de, hoje)
      lista.push({ numero: n, de, ate, meta: metaSemana, real: c?.real ?? null, situacao: 'atual' })
      continue
    }
    const c = compararNoPeriodo(p, pesagens, de, ate)
    if (!c) {
      lista.push({ numero: n, de, ate, meta: metaSemana, real: null, situacao: 'sem_pesagem' })
      continue
    }
    const cumpriu = p.sentido < 0 ? c.real <= c.plano + 0.05 : c.real >= c.plano - 0.05
    lista.push({ numero: n, de, ate, meta: c.plano, real: c.real, situacao: cumpriu ? 'cumprida' : 'nao_cumprida' })
  }
  return lista
}

/** Quanto a média dos últimos 7 dias está à frente (+) ou atrás (−) do plano nos mesmos dias, em kg. */
export function adiantamento(p: Plano, pesagens: Pesagem[], hoje = dataLocal(new Date())): number | null {
  const c = compararNoPeriodo(p, pesagens, somarDias(hoje, -6), hoje)
  return c ? (c.real - c.plano) * p.sentido : null
}

/** Ritmo semanal em relação ao peso: perder até 1% por semana preserva músculo; ganhar acima de 0,5% vira gordura. */
export function lerRitmo(ritmo: number, peso: number, sentido: -1 | 1): { rotulo: string; descricao: string; tom: Tom } {
  const pct = (ritmo / peso) * 100
  const texto = `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(pct)}% do peso por semana`
  if (sentido < 0) {
    if (pct < 0.25) return { rotulo: 'Bem lento', descricao: `${texto}. Seguro, mas demora.`, tom: 'neutro' }
    if (pct <= 1) return { rotulo: 'Recomendado', descricao: `${texto}. Perde gordura preservando músculo e treino.`, tom: 'bom' }
    if (pct <= 1.5) return { rotulo: 'Agressivo', descricao: `${texto}. Pode custar massa muscular e rendimento nos treinos.`, tom: 'atencao' }
    return { rotulo: 'Muito agressivo', descricao: `${texto}. Difícil de sustentar e arriscado para quem treina.`, tom: 'alerta' }
  }
  if (pct <= 0.25) return { rotulo: 'Ganho limpo', descricao: `${texto}. Favorece ganhar músculo, não gordura.`, tom: 'bom' }
  if (pct <= 0.5) return { rotulo: 'Moderado', descricao: `${texto}. Bom equilíbrio entre velocidade e qualidade.`, tom: 'bom' }
  return { rotulo: 'Rápido', descricao: `${texto}. Acima de 0,5% por semana o ganho tende a ser mais gordura.`, tom: 'atencao' }
}

export interface GastoDiario {
  basal: number | null
  treinos: GastoTreinos
  /** basal × 1,2 (dia a dia) + treinos */
  total: number | null
}

/** Gasto do dia ≈ basal (Mifflin) × 1,2 + média dos treinos — o mesmo cálculo da Nutrição. */
export function gastoDiario(a: Avaliacao, treinos: Treino[]): GastoDiario {
  const peso = a.atual.peso_kg
  const basal = a.alturaCm && a.sexo && a.anos !== null ? (taxasBasais(peso, a.alturaCm, a.anos, a.sexo, null)[0]?.valor ?? null) : null
  const t = gastoTreinos(treinos, peso)
  return { basal, treinos: t, total: basal ? Math.round(basal * 1.2 + t.kcalDia) : null }
}
