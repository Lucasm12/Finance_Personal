import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheckIcon, CalendarRangeIcon, ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, NotebookPenIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Abas, BarraProgresso, Cabecalho, SeloSituacao } from '@/components/pessoal/Comum'
import { SeletorHumor } from '@/components/pessoal/SeletorHumor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAreas, useDiario, useMetas, useResumoSemana, useRevisoes, useSalvarDiario, useSalvarRevisao } from '@/hooks/usePessoal'
import { mensagemErro } from '@/lib/erros'
import { competenciaDe, formatarData, nomeCompetencia, somarMeses } from '@/lib/format'
import { dataCurta, dataPorExtenso, diaDaSemana, hojeSP, HUMORES, porcento, semanaParaRevisao } from '@/lib/pessoal'
import { inicioSemana, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Diario as EntradaDiario, Revisao } from '@/types/pessoal'

type Aba = 'diario' | 'semanal' | 'mensal'

// -----------------------------------------------------------------------------
// Diário do dia
// -----------------------------------------------------------------------------

function FormDiario({ data, entrada }: { data: string; entrada: EntradaDiario | undefined }) {
  const salvar = useSalvarDiario()
  const [humor, setHumor] = useState<number | null>(entrada?.humor ?? null)
  const [gratidao, setGratidao] = useState<string[]>(() => [0, 1, 2].map((i) => entrada?.gratidao[i] ?? ''))
  const [texto, setTexto] = useState(entrada?.texto ?? '')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      await salvar.mutateAsync({
        data,
        humor,
        gratidao: gratidao.map((g) => g.trim().slice(0, 300)).filter(Boolean),
        texto: texto.trim() || null,
      })
      toast.success('Diário salvo.')
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Como foi o dia?</span>
        <SeletorHumor valor={humor} onChange={setHumor} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">3 motivos de gratidão</legend>
        {gratidao.map((g, i) => (
          <Input
            key={i}
            maxLength={300}
            aria-label={`Gratidão ${i + 1}`}
            placeholder={`${i + 1}.`}
            value={g}
            onChange={(e) => setGratidao((atual) => atual.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="diario-texto">Texto livre</Label>
        <Textarea id="diario-texto" rows={6} maxLength={10000} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <span className="text-muted-foreground text-right text-[11px] tabular-nums">{texto.length}/10.000</span>
      </div>
      <Button type="submit" className="w-fit" disabled={salvar.isPending}>
        {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
        Salvar
      </Button>
    </form>
  )
}

function AbaDiario() {
  const hoje = hojeSP()
  const [data, setData] = useState(hoje)
  const diario = useDiario()
  const entradas = diario.data ?? []
  const entrada = entradas.find((d) => d.data === data)
  const limite = somarDias(hoje, -90)

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="gap-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <Button variant="outline" size="icon" aria-label="Dia anterior" disabled={data <= limite} onClick={() => setData(somarDias(data, -1))}>
            <ChevronLeftIcon />
          </Button>
          <CardTitle className="text-center text-base first-letter:uppercase" aria-live="polite">
            {data === hoje ? `Hoje · ${dataPorExtenso(data)}` : dataPorExtenso(data)}
          </CardTitle>
          <Button variant="outline" size="icon" aria-label="Próximo dia" disabled={data >= hoje} onClick={() => setData(somarDias(data, 1))}>
            <ChevronRightIcon />
          </Button>
        </CardHeader>
        <CardContent>
          {diario.isPending ? <Skeleton className="h-72" /> : <FormDiario key={`${data}-${entrada?.atualizado_em ?? ''}`} data={data} entrada={entrada} />}
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Últimos dias</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          {entradas.length ? (
            <ul className="grid gap-0.5">
              {entradas.slice(0, 30).map((d) => {
                const h = HUMORES.find((x) => x.valor === d.humor)
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setData(d.data)}
                      className={cn('hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm', d.data === data && 'bg-accent')}
                    >
                      {h ? <h.icone className={cn('size-4 shrink-0', h.classe)} aria-label={h.rotulo} /> : <span className="size-4 shrink-0" />}
                      <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">{dataCurta(d.data)}</span>
                      <span className="min-w-0 flex-1 truncate">{d.gratidao[0] ?? d.texto ?? ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground px-2 text-sm">Nenhum registro nos últimos 90 dias.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Revisões
// -----------------------------------------------------------------------------

const PERGUNTAS_SEMANA: { chave: string; rotulo: string }[] = [
  { chave: 'deu_certo', rotulo: 'O que deu certo?' },
  { chave: 'nao_deu', rotulo: 'O que não deu certo?' },
  { chave: 'ajustar', rotulo: 'O que vou ajustar?' },
]
const PERGUNTAS_MES: { chave: string; rotulo: string }[] = [
  { chave: 'conquistas', rotulo: 'Principais conquistas do mês' },
  { chave: 'travou', rotulo: 'O que travou o progresso das metas?' },
  { chave: 'foco', rotulo: 'Foco do próximo mês' },
]

function FormRevisao({
  tipo,
  periodo,
  revisao,
  perguntas,
  prioridades,
}: {
  tipo: Revisao['tipo']
  periodo: string
  revisao: Revisao | undefined
  perguntas: { chave: string; rotulo: string }[]
  prioridades?: boolean
}) {
  const salvar = useSalvarRevisao()
  const [respostas, setRespostas] = useState<Record<string, string>>(revisao?.respostas ?? {})
  const responder = (chave: string, valor: string) => setRespostas((r) => ({ ...r, [chave]: valor }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const limpas = Object.fromEntries(
      Object.entries(respostas)
        .map(([k, v]) => [k, v.trim().slice(0, 4000)])
        .filter(([, v]) => v),
    )
    try {
      await salvar.mutateAsync({ tipo, periodo_inicio: periodo, respostas: limpas })
      toast.success('Revisão salva.')
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      {perguntas.map((p) => (
        <div key={p.chave} className="grid gap-1.5">
          <Label htmlFor={`rev-${p.chave}`}>{p.rotulo}</Label>
          <Textarea id={`rev-${p.chave}`} rows={3} maxLength={4000} value={respostas[p.chave] ?? ''} onChange={(e) => responder(p.chave, e.target.value)} />
        </div>
      ))}
      {prioridades && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">3 prioridades da próxima semana</legend>
          {[1, 2, 3].map((n) => (
            <Input
              key={n}
              maxLength={300}
              aria-label={`Prioridade ${n}`}
              placeholder={`${n}.`}
              value={respostas[`prioridade_${n}`] ?? ''}
              onChange={(e) => responder(`prioridade_${n}`, e.target.value)}
            />
          ))}
        </fieldset>
      )}
      <Button type="submit" className="w-fit" disabled={salvar.isPending}>
        {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
        Salvar revisão
      </Button>
    </form>
  )
}

function Linha({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="text-right font-medium tabular-nums">
        {valor}
        {detalhe && <span className="text-muted-foreground block text-xs font-normal">{detalhe}</span>}
      </dd>
    </div>
  )
}

function AbaSemanal() {
  const hoje = hojeSP()
  const [semana, setSemana] = useState(() => semanaParaRevisao(hoje))
  const resumo = useResumoSemana(semana)
  const revisoes = useRevisoes()
  const revisao = revisoes.data?.find((r) => r.tipo === 'semanal' && r.periodo_inicio === semana)
  const r = resumo.data
  const fim = somarDias(semana, 6)

  return (
    <div className="grid gap-4">
      {diaDaSemana(hoje) === 7 && semana === inicioSemana(hoje) && (
        <p className="bg-primary/10 rounded-lg px-3 py-2 text-sm">Hoje é domingo: um bom momento para revisar a semana e escolher as prioridades da próxima.</p>
      )}
      <div className="flex items-center justify-center gap-1">
        <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-52 text-center font-semibold" aria-live="polite">
          {formatarData(semana).slice(0, 5)} a {formatarData(fim)}
        </span>
        <Button variant="outline" size="icon" aria-label="Próxima semana" disabled={semana >= inicioSemana(hoje)} onClick={() => setSemana(somarDias(semana, 7))}>
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">Resumo da semana</CardTitle>
            <CardDescription>Calculado automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            {!r ? (
              <Skeleton className="h-48" />
            ) : (
              <dl>
                <Linha
                  rotulo="Hábitos"
                  valor={r.habitos.previstos ? porcento(r.habitos.feitos / r.habitos.previstos) : '—'}
                  detalhe={`${r.habitos.feitos} de ${r.habitos.previstos} previstos`}
                />
                <Linha rotulo="Leitura da Bíblia" valor={`${r.leitura.capitulos} capítulos`} detalhe={`em ${r.leitura.dias} de 7 dias`} />
                <Linha
                  rotulo="Metas"
                  valor={`${r.metas.registros + r.metas.marcos} avanços`}
                  detalhe={r.metas.atrasadas ? `${r.metas.atrasadas} atrasadas hoje` : 'nenhuma atrasada hoje'}
                />
                <Linha
                  rotulo="Treinos"
                  valor={`${r.treinos.quantidade}`}
                  detalhe={`${String(r.treinos.distancia_km).replace('.', ',')} km · ${String(r.treinos.horas).replace('.', ',')} h`}
                />
                <Linha rotulo="Tarefas" valor={`${r.tarefas.concluidas} feitas`} detalhe={r.tarefas.pendentes ? `${r.tarefas.pendentes} ficaram pendentes` : undefined} />
                <Linha
                  rotulo="Diário"
                  valor={`${r.diario.dias} dias`}
                  detalhe={r.diario.humor_medio !== null ? `humor médio ${String(r.diario.humor_medio).replace('.', ',')} de 5` : undefined}
                />
              </dl>
            )}
            {resumo.error && <p className="text-destructive text-sm">{mensagemErro(resumo.error)}</p>}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Revisão</CardTitle>
          </CardHeader>
          <CardContent>
            {revisoes.isPending ? (
              <Skeleton className="h-72" />
            ) : (
              <FormRevisao
                key={`${semana}-${revisao?.atualizado_em ?? ''}`}
                tipo="semanal"
                periodo={semana}
                revisao={revisao}
                perguntas={PERGUNTAS_SEMANA}
                prioridades
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AbaMensal() {
  const hoje = hojeSP()
  const atual = competenciaDe(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)))
  const [mes, setMes] = useState(atual)
  const metas = useMetas()
  const areas = useAreas()
  const revisoes = useRevisoes()
  const revisao = revisoes.data?.find((r) => r.tipo === 'mensal' && r.periodo_inicio === mes)
  const ano = Number(mes.slice(0, 4))
  const doAno = (metas.data ?? []).filter((m) => m.ano === ano && m.situacao !== 'pausada')
  const concluidas = doAno.filter((m) => m.situacao === 'concluida').length
  const atrasadas = doAno.filter((m) => m.situacao === 'atrasada').length

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-center gap-1">
        <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-44 text-center font-semibold" aria-live="polite">
          {nomeCompetencia(mes)}
        </span>
        <Button variant="outline" size="icon" aria-label="Próximo mês" disabled={mes >= atual} onClick={() => setMes(somarMeses(mes, 1))}>
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">Metas de {ano}</CardTitle>
            <CardDescription>
              {doAno.length} ativas · {concluidas} concluídas{atrasadas ? ` · ${atrasadas} atrasadas` : ''} (situação de hoje)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-4">
            {metas.isPending ? (
              <Skeleton className="h-48" />
            ) : doAno.length ? (
              doAno.map((m) => (
                <div key={m.id} className="grid gap-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{m.titulo}</span>
                    <SeloSituacao situacao={m.situacao} />
                  </div>
                  <BarraProgresso
                    valor={m.percentual}
                    esperado={m.situacao === 'concluida' ? null : m.esperado}
                    cor={areas.data?.find((a) => a.id === m.area_id)?.cor}
                    rotulo={`Progresso de ${m.titulo}`}
                  />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma meta em {ano}.</p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Revisão do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {revisoes.isPending ? (
              <Skeleton className="h-72" />
            ) : (
              <FormRevisao key={`${mes}-${revisao?.atualizado_em ?? ''}`} tipo="mensal" periodo={mes} revisao={revisao} perguntas={PERGUNTAS_MES} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Diario() {
  const [params, setParams] = useSearchParams()
  const aba = (['semanal', 'mensal'].includes(params.get('aba') ?? '') ? params.get('aba') : 'diario') as Aba

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <Cabecalho titulo="Diário e revisões" descricao="Um registro curto por dia, a revisão da semana (aos domingos) e a do mês." />
      <Abas
        rotulo="Diário"
        valor={aba}
        onChange={(v) => setParams(v === 'diario' ? {} : { aba: v }, { replace: true })}
        opcoes={[
          { valor: 'diario', rotulo: 'Diário', icone: NotebookPenIcon },
          { valor: 'semanal', rotulo: 'Revisão semanal', icone: CalendarCheckIcon },
          { valor: 'mensal', rotulo: 'Revisão mensal', icone: CalendarRangeIcon },
        ]}
      />
      {aba === 'diario' && <AbaDiario />}
      {aba === 'semanal' && <AbaSemanal />}
      {aba === 'mensal' && <AbaMensal />}
    </div>
  )
}
