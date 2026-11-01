import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3Icon, BookMarkedIcon, ChevronDownIcon, HighlighterIcon, LibraryIcon, NotebookPenIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { CalorLeitura } from '@/components/pessoal/biblia/CalorLeitura'
import { CardLeituraHoje } from '@/components/pessoal/biblia/CardLeituraHoje'
import { Abas, BarraProgresso, Cabecalho, Vazio } from '@/components/pessoal/Comum'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAnotacoes,
  useCapitulosLidos,
  useDesmarcarVersiculo,
  useEstatisticasLeitura,
  useExcluirAnotacao,
  useLivros,
  useMarcacoes,
  useResumoLeitura,
} from '@/hooks/useBiblia'
import { mensagemErro } from '@/lib/erros'
import { formatarData } from '@/lib/format'
import { CORES_MARCACAO, dataCurta, diaSP, hojeSP, porcento, referencia, TOTAL_CAPITULOS } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import { rotaLeitura } from '@/modulos'
import type { CorMarcacao, LivroBiblia, Testamento } from '@/types/pessoal'

type Aba = 'livros' | 'estatisticas' | 'versiculos' | 'anotacoes'
const ABAS: { valor: Aba; rotulo: string; icone: typeof LibraryIcon }[] = [
  { valor: 'livros', rotulo: 'Livros', icone: LibraryIcon },
  { valor: 'estatisticas', rotulo: 'Estatísticas', icone: BarChart3Icon },
  { valor: 'versiculos', rotulo: 'Meus versículos', icone: HighlighterIcon },
  { valor: 'anotacoes', rotulo: 'Anotações', icone: NotebookPenIcon },
]

// -----------------------------------------------------------------------------
// Livros, separados por testamento, com o percentual lido
// -----------------------------------------------------------------------------

function LinhaLivro({ livro, lidos, hoje }: { livro: LivroBiblia; lidos: Map<number, string>; hoje: string }) {
  const [aberto, setAberto] = useState(false)
  const fracao = lidos.size / livro.total_capitulos
  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="hover:bg-accent/40 grid w-full grid-cols-[minmax(0,9rem)_1fr_auto_auto] items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
      >
        <span className="truncate font-medium">{livro.nome}</span>
        <BarraProgresso valor={fracao} rotulo={`${livro.nome}: capítulos lidos`} />
        <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
          {lidos.size}/{livro.total_capitulos}
        </span>
        <ChevronDownIcon className={cn('text-muted-foreground size-4 transition-transform', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 px-3 pb-3">
          {Array.from({ length: livro.total_capitulos }, (_, i) => i + 1).map((c) => {
            const em = lidos.get(c)
            return (
              <Link
                key={c}
                to={rotaLeitura(livro.id, c)}
                title={em ? `Lido em ${formatarData(diaSP(em))}` : 'Não lido'}
                className={cn(
                  'flex h-9 items-center justify-center rounded-md border text-sm tabular-nums transition-colors',
                  em ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                  em && diaSP(em) === hoje && 'ring-primary/40 ring-2 ring-offset-1',
                )}
              >
                {c}
                <span className="sr-only">{em ? ' (lido)' : ''}</span>
              </Link>
            )
          })}
        </div>
      )}
    </li>
  )
}

function ListaLivros() {
  const livros = useLivros()
  const lidos = useCapitulosLidos()
  const hoje = hojeSP()
  const porLivro = useMemo(() => {
    const m = new Map<number, Map<number, string>>()
    for (const l of lidos.data ?? []) {
      if (!m.has(l.livro_id)) m.set(l.livro_id, new Map())
      m.get(l.livro_id)!.set(l.capitulo, l.concluido_em)
    }
    return m
  }, [lidos.data])

  if (livros.isPending || lidos.isPending) return <Skeleton className="h-96" />
  if (livros.error || lidos.error) return <p className="text-destructive text-sm">{mensagemErro(livros.error ?? lidos.error)}</p>

  const testamento = (t: Testamento) => {
    const lista = livros.data.filter((l) => l.testamento === t)
    const total = lista.reduce((s, l) => s + l.total_capitulos, 0)
    const feitos = lista.reduce((s, l) => s + (porLivro.get(l.id)?.size ?? 0), 0)
    return (
      <Card key={t} className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="flex items-baseline justify-between gap-2">
            {t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              {feitos}/{total} · {porcento(feitos / total)}
            </span>
          </CardTitle>
          <CardDescription>
            {lista.length} livros · {lista.filter((l) => (porLivro.get(l.id)?.size ?? 0) === l.total_capitulos).length} concluídos
          </CardDescription>
        </CardHeader>
        <ul className="border-t">
          {lista.map((l) => (
            <LinhaLivro key={l.id} livro={l} lidos={porLivro.get(l.id) ?? new Map()} hoje={hoje} />
          ))}
        </ul>
      </Card>
    )
  }

  return <div className="grid items-start gap-4 lg:grid-cols-2">{(['AT', 'NT'] as const).map(testamento)}</div>
}

// -----------------------------------------------------------------------------
// Estatísticas
// -----------------------------------------------------------------------------

const EIXO = { tickLine: false, axisLine: false, tick: { fill: 'var(--chart-axis)', fontSize: 11 } }
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="text-muted-foreground text-xs">{detalhe}</p>}
    </div>
  )
}

function Estatisticas() {
  const estatisticas = useEstatisticasLeitura()
  const resumo = useResumoLeitura()
  if (estatisticas.isPending || resumo.isPending) return <Skeleton className="h-96" />
  if (estatisticas.error || resumo.error) return <p className="text-destructive text-sm">{mensagemErro(estatisticas.error ?? resumo.error)}</p>
  const e = estatisticas.data
  const r = resumo.data
  const porMes = e.por_mes.map((m) => ({ ...m, capitulos: Number(m.capitulos), rotulo: `${MESES[Number(m.mes.slice(5, 7)) - 1]}/${m.mes.slice(2, 4)}` }))

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Numero rotulo="Capítulos lidos" valor={String(r.total_lidos)} detalhe={`de ${TOTAL_CAPITULOS}`} />
        <Numero rotulo="Da Bíblia" valor={porcento(r.percentual)} />
        <Numero rotulo="Sequência atual" valor={`${r.sequencia} ${r.sequencia === 1 ? 'dia' : 'dias'}`} />
        <Numero rotulo="Recorde" valor={`${r.recorde} ${r.recorde === 1 ? 'dia' : 'dias'}`} />
        <Numero rotulo="Livros concluídos" valor={String(e.livros_concluidos)} detalhe="de 66" />
        <Numero rotulo="Média (30 dias)" valor={String(e.media_30_dias).replace('.', ',')} detalhe="capítulos por dia" />
      </div>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Capítulos por mês</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} interval="preserveStartEnd" />
                <YAxis {...EIXO} width={36} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof porMes)[number] | undefined
                    if (!active || !p) return null
                    return (
                      <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
                        <div className="font-medium">{p.rotulo}</div>
                        <div className="tabular-nums">
                          {p.capitulos} {p.capitulos === 1 ? 'capítulo' : 'capítulos'}
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="capitulos" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Capítulos por mês</caption>
            <tbody>
              {porMes.map((m) => (
                <tr key={m.mes}>
                  <th scope="row">{m.rotulo}</th>
                  <td>{m.capitulos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Dias com leitura</CardTitle>
          <CardDescription>{e.dias_com_leitura} dias no total. Passe o dedo ou o mouse sobre um dia para ver quantos capítulos.</CardDescription>
        </CardHeader>
        <CardContent>
          <CalorLeitura dias={e.calor.map((d) => ({ ...d, capitulos: Number(d.capitulos) }))} hoje={r.hoje} />
        </CardContent>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Meus versículos e anotações
// -----------------------------------------------------------------------------

function MeusVersiculos() {
  const marcacoes = useMarcacoes()
  const livros = useLivros()
  const desmarcar = useDesmarcarVersiculo()
  const [cor, setCor] = useState<CorMarcacao | null>(null)

  if (marcacoes.isPending) return <Skeleton className="h-64" />
  if (marcacoes.error) return <p className="text-destructive text-sm">{mensagemErro(marcacoes.error)}</p>
  if (!marcacoes.data.length) {
    return (
      <Vazio icone={HighlighterIcon} titulo="Nenhum versículo marcado ainda">
        Na leitura, toque em um versículo para marcá-lo com uma cor. Ele aparece aqui.
      </Vazio>
    )
  }
  const lista = cor ? marcacoes.data.filter((m) => m.cor === cor) : marcacoes.data

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por cor">
        <Button size="sm" variant={cor === null ? 'secondary' : 'ghost'} onClick={() => setCor(null)}>
          Todas ({marcacoes.data.length})
        </Button>
        {(Object.keys(CORES_MARCACAO) as CorMarcacao[])
          .filter((c) => marcacoes.data.some((m) => m.cor === c))
          .map((c) => (
            <Button key={c} size="sm" variant={cor === c ? 'secondary' : 'ghost'} onClick={() => setCor(c)}>
              <span className={cn('size-3 rounded-full', CORES_MARCACAO[c].amostra)} aria-hidden />
              {CORES_MARCACAO[c].rotulo}
            </Button>
          ))}
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {lista.map((m) => {
          const v = m.versiculo
          return (
            <li key={m.id} className={cn('rounded-xl border p-3', CORES_MARCACAO[m.cor].fundo)}>
              <div className="flex items-start justify-between gap-2">
                {v ? (
                  <Link to={`${rotaLeitura(v.livro_id, v.capitulo)}#v${v.versiculo}`} className="text-sm font-semibold hover:underline">
                    {referencia(livros.data, v.livro_id, v.capitulo, v.versiculo)}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold">Versículo</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mt-1 -mr-1 size-8"
                  aria-label="Remover marcação"
                  onClick={() => desmarcar.mutate(m.id, { onSuccess: () => toast.success('Marcação removida.') })}
                >
                  <Trash2Icon />
                </Button>
              </div>
              {v && <p className="mt-1 text-sm leading-relaxed">{v.texto}</p>}
              {m.nota && <p className="text-muted-foreground mt-2 border-t border-current/10 pt-2 text-xs">{m.nota}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Anotacoes() {
  const anotacoes = useAnotacoes()
  const livros = useLivros()
  const excluir = useExcluirAnotacao()

  if (anotacoes.isPending) return <Skeleton className="h-64" />
  if (anotacoes.error) return <p className="text-destructive text-sm">{mensagemErro(anotacoes.error)}</p>
  if (!anotacoes.data.length) {
    return (
      <Vazio icone={BookMarkedIcon} titulo="Nenhuma anotação ainda">
        Ao concluir um capítulo, você pode anotar o versículo que mais marcou, uma reflexão e uma aplicação prática.
      </Vazio>
    )
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {anotacoes.data.map((a) => (
        <li key={a.id}>
          <Card className="gap-2 py-4">
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
              <div>
                <Link to={rotaLeitura(a.livro_id, a.capitulo)} className="font-semibold hover:underline">
                  {referencia(livros.data, a.livro_id, a.capitulo, a.versiculo_destaque)}
                </Link>
                <p className="text-muted-foreground text-xs">{dataCurta(diaSP(a.created_at))}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-1 size-8"
                aria-label="Excluir anotação"
                onClick={() => excluir.mutate(a.id, { onSuccess: () => toast.success('Anotação excluída.') })}
              >
                <Trash2Icon />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 px-4 text-sm">
              {a.reflexao && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Reflexão</p>
                  <p className="whitespace-pre-line">{a.reflexao}</p>
                </div>
              )}
              {a.aplicacao && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Aplicação prática</p>
                  <p className="whitespace-pre-line">{a.aplicacao}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export default function Biblia() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.find((a) => a.valor === params.get('aba'))?.valor ?? 'livros') as Aba

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <Cabecalho
        titulo="Bíblia"
        descricao="Almeida, edição de 1911 (domínio público, grafia da época). O texto fica no seu banco: a leitura não depende de internet de terceiros."
      />
      <CardLeituraHoje titulo="Seu plano de leitura" mostrarTrocar />
      <Abas rotulo="Bíblia" valor={aba} opcoes={ABAS} onChange={(v) => setParams(v === 'livros' ? {} : { aba: v }, { replace: true })} />
      {aba === 'livros' && <ListaLivros />}
      {aba === 'estatisticas' && <Estatisticas />}
      {aba === 'versiculos' && <MeusVersiculos />}
      {aba === 'anotacoes' && <Anotacoes />}
    </div>
  )
}
