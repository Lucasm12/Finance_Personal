import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CheckIcon, CircleDashedIcon, LoaderCircleIcon, MinusIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Dado, diferencaKg, kg, Nota } from '@/components/triathlon/corpo/Blocos'
import { SeloFaixa } from '@/components/triathlon/corpo/Faixas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useSalvarPerfil } from '@/hooks/useTriathlon'
import {
  adiantamento,
  dataCurta,
  gastoDiario,
  KCAL_POR_KG,
  lerRitmo,
  mediaEm,
  mediaPlanejada,
  montarPlano,
  planoDoPerfil,
  previsaoMeta,
  semanaDoPlano,
  semanasDoPlano,
  type Avaliacao,
  type Plano,
  type SituacaoSemana,
} from '@/lib/corpo'
import { dataLocal, formatarDecimal, formatarInteiro, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { PerfilAtleta, Pesagem, Treino } from '@/types/triathlon'

const RITMOS = [0.25, 0.5, 0.75, 1]

const lerNumero = (t: string) => {
  const v = t.trim().replace(',', '.')
  return v ? Number(v) : null
}
const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))
const umaCasa = (n: number) => texto(Math.round(n * 10) / 10)
const semanasTexto = (s: number) => {
  const n = Math.ceil(s)
  return `${n} semana${n === 1 ? '' : 's'}`
}

const SITUACAO: Record<SituacaoSemana, { rotulo: string; icone: typeof CheckIcon; classe: string }> = {
  cumprida: { rotulo: 'cumprida', icone: CheckIcon, classe: 'text-status-bom' },
  nao_cumprida: { rotulo: 'não cumprida', icone: XIcon, classe: 'text-status-perigo' },
  atual: { rotulo: 'em andamento', icone: CircleDashedIcon, classe: 'text-foreground' },
  futura: { rotulo: '', icone: MinusIcon, classe: 'text-muted-foreground/50' },
  sem_pesagem: { rotulo: 'sem pesagem', icone: MinusIcon, classe: 'text-muted-foreground' },
}

interface Props {
  a: Avaliacao
  perfil: PerfilAtleta | null | undefined
  pesagens: Pesagem[]
  treinos: Treino[]
}

export function CardPlano({ a, perfil, pesagens, treinos }: Props) {
  const salvar = useSalvarPerfil()
  const hoje = dataLocal(new Date())
  const salvo = planoDoPerfil(perfil)
  const mediaHoje = Math.round(a.media7 * 10) / 10

  const [meta, setMeta] = useState(texto(perfil?.peso_meta_kg))
  const [ritmo, setRitmo] = useState(texto(perfil?.meta_semanal_kg))
  const [inicio, setInicio] = useState(perfil?.meta_inicio ?? hoje)
  const [pesoInicial, setPesoInicial] = useState(texto(perfil?.meta_peso_inicial_kg) || umaCasa(mediaEm(pesagens, inicio) ?? a.media7))

  function mudarInicio(data: string) {
    setInicio(data)
    const media = data ? mediaEm(pesagens, data) : null
    if (media !== null) setPesoInicial(umaCasa(media))
  }

  function recomecarHoje() {
    setInicio(hoje)
    setPesoInicial(umaCasa(a.media7))
  }

  // O que está no formulário vira uma simulação ao vivo; o gráfico usa o plano salvo
  const nMeta = lerNumero(meta)
  const nRitmo = lerNumero(ritmo)
  const nInicial = lerNumero(pesoInicial)
  const plano =
    nMeta && nRitmo && nInicial && inicio && nRitmo >= 0.05 && nRitmo <= 2 ? montarPlano(inicio, nInicial, nMeta, nRitmo) : null
  const alterado =
    !salvo ||
    salvo.meta !== nMeta ||
    salvo.ritmo !== nRitmo ||
    salvo.inicio !== inicio ||
    salvo.pesoInicial !== nInicial

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (nMeta === null || !Number.isFinite(nMeta) || nMeta < 30 || nMeta > 250) return toast.error('Peso objetivo entre 30 e 250 kg.')
    if (nRitmo === null || !Number.isFinite(nRitmo) || nRitmo < 0.05 || nRitmo > 2) return toast.error('Meta semanal entre 0,05 e 2 kg por semana.')
    if (!inicio || inicio > hoje) return toast.error('O início do plano precisa ser hoje ou uma data passada.')
    if (nInicial === null || !Number.isFinite(nInicial) || nInicial < 30 || nInicial > 250) return toast.error('Peso no início entre 30 e 250 kg.')
    if (Math.abs(nInicial - nMeta) < 0.1) return toast.error('O peso objetivo é igual ao peso do início: não há o que planejar.')
    try {
      await salvar.mutateAsync({ peso_meta_kg: nMeta, meta_semanal_kg: nRitmo, meta_inicio: inicio, meta_peso_inicial_kg: nInicial })
      toast.success('Plano salvo.')
    } catch {
      // erro já exibido pelo hook
    }
  }

  async function removerPlano() {
    try {
      await salvar.mutateAsync({ meta_semanal_kg: null, meta_inicio: null, meta_peso_inicial_kg: null })
      setRitmo('')
      toast.success('Plano removido. O peso objetivo continua salvo.')
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Meta semanal e previsão</CardTitle>
        <CardDescription>
          Escolha o peso objetivo e quantos kg quer perder (ou ganhar) por semana. O app monta a meta de cada semana e calcula
          quando você chega lá — pelo plano e pelo seu ritmo real.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <form onSubmit={enviar} className="grid gap-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="plano-meta" className="text-xs">
                  Peso objetivo (kg)
                </Label>
                <Input id="plano-meta" inputMode="decimal" placeholder="72" value={meta} onChange={(e) => setMeta(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plano-ritmo" className="text-xs">
                  Meta por semana (kg)
                </Label>
                <Input id="plano-ritmo" inputMode="decimal" placeholder="0,5" value={ritmo} onChange={(e) => setRitmo(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sugestões de meta semanal">
              {RITMOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRitmo(texto(r))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors',
                    nRitmo === r ? 'bg-primary text-primary-foreground border-transparent' : 'hover:bg-accent text-muted-foreground',
                  )}
                >
                  {texto(r)} kg/sem
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="plano-inicio" className="text-xs">
                  Início do plano
                </Label>
                <Input id="plano-inicio" type="date" max={hoje} value={inicio} onChange={(e) => mudarInicio(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plano-inicial" className="text-xs">
                  Peso no início (kg)
                </Label>
                <Input id="plano-inicial" inputMode="decimal" value={pesoInicial} onChange={(e) => setPesoInicial(e.target.value)} />
              </div>
            </div>
            <p className="text-muted-foreground -mt-1 text-[11px]">
              O peso do início vem da média de 7 dias daquela data; pode ajustar.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={salvar.isPending || !alterado}>
                {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
                {salvo ? (alterado ? 'Salvar alterações' : 'Plano salvo') : 'Salvar plano'}
              </Button>
              <Button type="button" variant="outline" onClick={recomecarHoje} disabled={inicio === hoje && nInicial === mediaHoje}>
                <RotateCcwIcon />
                Recomeçar hoje
              </Button>
              {salvo && (
                <Button type="button" variant="ghost" className="text-muted-foreground" onClick={removerPlano} disabled={salvar.isPending}>
                  Remover plano
                </Button>
              )}
            </div>
            {salvo && alterado && plano && <p className="text-xs text-amber-700 dark:text-amber-400">Simulação: salve para atualizar o gráfico.</p>}
          </form>

          {plano ? (
            <Previsoes plano={plano} a={a} pesagens={pesagens} treinos={treinos} />
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              {nMeta && nInicial && Math.abs(nMeta - nInicial) < 0.1
                ? 'O peso objetivo é igual ao peso do início.'
                : 'Preencha o peso objetivo e a meta por semana para ver a previsão.'}
            </p>
          )}
        </div>

        {plano && <TabelaSemanas plano={plano} pesagens={pesagens} />}
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------

function Previsoes({ plano, a, pesagens, treinos }: { plano: Plano; a: Avaliacao; pesagens: Pesagem[]; treinos: Treino[] }) {
  const hoje = dataLocal(new Date())
  const atual = a.media7
  const perder = plano.sentido < 0
  const verbo = perder ? 'perder' : 'ganhar'
  const falta = Math.abs(atual - plano.meta)
  const chegou = perder ? atual <= plano.meta + 0.05 : atual >= plano.meta - 0.05
  const percorrido = Math.min(1, Math.max(0, (plano.pesoInicial - atual) / (plano.pesoInicial - plano.meta)))
  const ritmo = lerRitmo(plano.ritmo, plano.pesoInicial, plano.sentido)

  const semana = semanaDoPlano(plano, hoje)
  const totalSemanas = Math.ceil(plano.semanas)
  const fimSemana = somarDias(plano.inicio, 7 * semana)
  // meta da semana = média planejada dos 7 dias, comparável com a média das pesagens
  const metaSemana = mediaPlanejada(plano, fimSemana)
  const adiante = adiantamento(plano, pesagens, hoje)
  const restantePlano = falta / plano.ritmo
  const real = a.tendencia ? previsaoMeta(atual, plano.meta, a.tendencia.kgSemana, hoje) : null
  const semanasAteFim = (new Date(`${plano.fim}T12:00:00`).getTime() - Date.now()) / (7 * 86_400_000)
  const necessario = semanasAteFim >= 1 ? falta / semanasAteFim : null

  const energia = gastoDiario(a, treinos)
  const kcalDia = Math.round((plano.ritmo * KCAL_POR_KG) / 7)
  const comer = energia.total ? energia.total + plano.sentido * kcalDia : null

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">
            {chegou ? 'Meta atingida!' : `${Math.round(percorrido * 100)}% do caminho`}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {kg(plano.pesoInicial)} → {kg(plano.meta)}
          </span>
        </div>
        <Progress value={percorrido * 100} aria-label="Progresso até o peso objetivo" />
        <div className="text-muted-foreground text-xs tabular-nums">
          Agora (média de 7 dias): {kg(atual)}
          {!chegou && ` · faltam ${kg(falta)}`}
        </div>
      </div>

      <div className="grid gap-1">
        <SeloFaixa faixa={ritmo} className="font-medium" />
        <p className="text-muted-foreground text-xs">{ritmo.descricao}</p>
      </div>

      {!chegou && semana <= totalSemanas && (
        <div className="bg-primary/5 border-primary/20 rounded-lg border px-3 py-2.5 text-sm">
          <div className="font-medium">
            Semana {semana} de {totalSemanas}: média da semana {perder ? 'até' : 'de pelo menos'} {kg(metaSemana)}
          </div>
          <div className="text-muted-foreground text-xs">
            De {dataCurta(somarDias(fimSemana, -6)).slice(0, 5)} a {dataCurta(fimSemana).slice(0, 5)}.{' '}
            {adiante === null
              ? 'Sem pesagens nos últimos 7 dias para comparar com o plano.'
              : Math.abs(adiante) < 0.2
                ? 'Você está no ritmo do plano.'
                : adiante > 0
                  ? `Você está ${kg(adiante)} adiantado em relação ao plano.`
                  : `Você está ${kg(-adiante)} atrasado em relação ao plano.`}
          </div>
        </div>
      )}
      {!chegou && semana > totalSemanas && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm">
          O prazo do plano terminou em {dataCurta(plano.fim)} e ainda faltam {kg(falta)}. Use <strong>Recomeçar hoje</strong> para
          montar um plano novo a partir do peso atual.
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <Dado
          rotulo="Pelo plano"
          valor={dataCurta(plano.fim)}
          detalhe={`${verbo} ${kg(Math.abs(plano.pesoInicial - plano.meta))} em ${semanasTexto(plano.semanas)} a partir de ${dataCurta(plano.inicio)}`}
        />
        <Dado
          rotulo="De hoje, no ritmo do plano"
          valor={chegou ? '—' : dataCurta(somarDias(hoje, Math.ceil(restantePlano * 7)))}
          detalhe={chegou ? 'meta já atingida' : `${kg(falta)} em ${semanasTexto(restantePlano)} a ${formatarDecimal(plano.ritmo)} kg/sem`}
        />
        <Dado
          rotulo="No seu ritmo real"
          valor={real ? dataCurta(real.data) : '—'}
          detalhe={
            chegou
              ? 'meta já atingida'
              : !a.tendencia
                ? 'precisa de 3 pesagens em pelo menos 1 semana'
                : real
                  ? `${diferencaKg(a.tendencia.kgSemana)}/sem nas últimas 4 semanas (${semanasTexto(real.semanas)})`
                  : `o ritmo das últimas 4 semanas (${diferencaKg(a.tendencia.kgSemana)}/sem) não leva até a meta`
          }
        />
        <Dado
          rotulo={perder ? 'Déficit por dia' : 'Superávit por dia'}
          valor={`${formatarInteiro(kcalDia)} kcal`}
          detalhe={
            comer
              ? `comer cerca de ${formatarInteiro(comer)} kcal/dia (gasto estimado ${formatarInteiro(energia.total!)})`
              : `${formatarDecimal(plano.ritmo)} kg × 7.700 kcal ÷ 7 dias`
          }
        />
      </dl>

      {!chegou && necessario !== null && adiante !== null && adiante < -0.2 && (
        <Nota>
          Para ainda chegar em {dataCurta(plano.fim)}, seria preciso {verbo} {formatarDecimal(Math.round(necessario * 100) / 100)} kg por
          semana daqui para frente.
        </Nota>
      )}
      <Nota>
        A previsão pelo ritmo real usa a tendência das suas pesagens; a do plano supõe que você cumpra a meta toda semana. 1 kg de
        peso corporal ≈ 7.700 kcal — na prática a perda desacelera um pouco com o tempo.
      </Nota>
    </div>
  )
}

function TabelaSemanas({ plano, pesagens }: { plano: Plano; pesagens: Pesagem[] }) {
  const semanas = semanasDoPlano(plano, pesagens)
  const caixa = useRef<HTMLDivElement>(null)
  const atual = semanas.find((s) => s.situacao === 'atual')
  const cumpridas = semanas.filter((s) => s.situacao === 'cumprida').length
  const avaliadas = semanas.filter((s) => s.situacao === 'cumprida' || s.situacao === 'nao_cumprida').length

  // rola a lista (só ela, não a página) até a semana atual
  useEffect(() => {
    const linha = caixa.current?.querySelector<HTMLElement>('[data-atual]')
    if (caixa.current && linha) caixa.current.scrollTop = linha.offsetTop - 48
  }, [atual?.numero])

  return (
    <div className="grid content-start gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Metas semana a semana</h3>
        {avaliadas > 0 && (
          <span className="text-muted-foreground text-xs">
            {cumpridas} de {avaliadas} semana(s) cumprida(s)
          </span>
        )}
      </div>
      <div ref={caixa} className="relative max-h-[28rem] overflow-y-auto rounded-lg border">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-card sticky top-0 z-10">
            <tr className="text-muted-foreground border-b text-right text-xs">
              <th className="px-3 py-2 text-left font-medium">Semana</th>
              <th className="px-2 py-2 font-medium">Até</th>
              <th className="px-2 py-2 font-medium">Meta</th>
              <th className="px-2 py-2 font-medium">Real</th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="sm:hidden">✓/✗</span>
                <span className="hidden sm:inline">Situação</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {semanas.map((s) => {
              const info = SITUACAO[s.situacao]
              return (
                <tr
                  key={s.numero}
                  data-atual={s.situacao === 'atual' || undefined}
                  className={cn('text-right', s.situacao === 'atual' && 'bg-muted font-medium', s.situacao === 'futura' && 'text-muted-foreground')}
                >
                  <td className="px-3 py-1.5 text-left">{s.numero}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{dataCurta(s.ate).slice(0, 5)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{kg(s.meta)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{s.real === null ? '—' : kg(s.real)}</td>
                  <td className="px-3 py-1.5 text-left whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs" title={info.rotulo || undefined}>
                      <info.icone className={cn('size-3.5', info.classe)} aria-hidden />
                      {/* no celular só o ícone (forma diferente para cada situação); o texto fica para leitores de tela */}
                      <span className="sr-only sm:not-sr-only">{info.rotulo}</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-[11px]">
        Meta e real são médias da semana (nos dias em que você se pesou), o que tira a oscilação do dia a dia. Na semana atual, o
        real vai até hoje.
      </p>
    </div>
  )
}
