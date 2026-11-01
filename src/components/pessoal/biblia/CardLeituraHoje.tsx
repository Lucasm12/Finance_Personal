import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenIcon, CheckIcon, FlameIcon, ListChecksIcon, TriangleAlertIcon } from 'lucide-react'

import { DialogPlano } from '@/components/pessoal/biblia/DialogPlano'
import { BarraProgresso } from '@/components/pessoal/Comum'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBibliaImportada, useLivros, useResumoLeitura } from '@/hooks/useBiblia'
import { mensagemErro } from '@/lib/erros'
import { PLANOS, porcento, referencia, situacaoLeitura, TOTAL_CAPITULOS } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import { rotaLeitura, ROTAS_PESSOAL } from '@/modulos'

/** Aviso quando o texto da Bíblia ainda não foi importado pelo seed. */
export function AvisoSemTexto() {
  return (
    <p className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        O texto da Bíblia ainda não foi importado. Rode <code className="font-mono text-xs">npm run seed:biblia</code> uma vez (passo a passo no
        README, seção “Bíblia”).
      </span>
    </p>
  )
}

/** Leitura do dia: capítulos do plano, meta, adiantado/atrasado e sequência. */
export function CardLeituraHoje({ titulo = 'Leitura de hoje', mostrarTrocar = false }: { titulo?: string; mostrarTrocar?: boolean }) {
  const resumo = useResumoLeitura()
  const livros = useLivros()
  const importada = useBibliaImportada()
  const [planoAberto, setPlanoAberto] = useState(false)
  const r = resumo.data
  const situacao = r ? situacaoLeitura(r) : null
  const pendente = r?.capitulos_hoje.find((c) => !c.lido) ?? r?.proximo ?? null
  const lidosHoje = r?.capitulos_hoje.filter((c) => c.lido).length ?? 0

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <BookOpenIcon className="text-primary size-5" />
          {titulo}
        </CardTitle>
        {r && r.sequencia > 0 && (
          <span className="flex items-center gap-1 text-sm font-medium" title={`Recorde: ${r.recorde} dias`}>
            <FlameIcon className="size-4 text-orange-500" aria-hidden />
            {r.sequencia} {r.sequencia === 1 ? 'dia' : 'dias'}
            <span className="sr-only"> seguidos de leitura</span>
          </span>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {resumo.isPending ? (
          <Skeleton className="h-24" />
        ) : resumo.error ? (
          <p className="text-destructive text-sm">{mensagemErro(resumo.error)}</p>
        ) : !r ? null : (
          <>
            {importada.data === false && <AvisoSemTexto />}

            {r.plano ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Plano {PLANOS[r.plano.tipo].rotulo.toLowerCase()} · dia {Math.max(r.plano.dias_passados, 0)} de {r.plano.dias_total}
                </p>
                {r.capitulos_hoje.length > 0 ? (
                  <>
                    <p className="text-sm">
                      Meta de hoje: <strong>{r.meta_diaria} capítulos</strong>
                      {lidosHoje > 0 && <span className="text-muted-foreground"> · {lidosHoje} lidos</span>}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {r.capitulos_hoje.map((c) => (
                        <li key={`${c.livro_id}-${c.capitulo}`}>
                          <Link
                            to={rotaLeitura(c.livro_id, c.capitulo)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              c.lido
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'hover:bg-accent',
                            )}
                          >
                            {c.lido && <CheckIcon className="size-3" aria-label="lido" />}
                            {referencia(livros.data, c.livro_id, c.capitulo, null, true)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm">Você terminou o plano. Parabéns!</p>
                )}
                {situacao && (
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      situacao.tipo === 'atrasado' ? 'bg-red-500/10' : situacao.tipo === 'adiantado' ? 'bg-emerald-500/10' : 'bg-muted/60',
                    )}
                  >
                    <p className="font-medium">{situacao.titulo}</p>
                    {situacao.sugestao && <p className="text-muted-foreground text-xs">{situacao.sugestao}</p>}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Escolha um plano para receber a meta de cada dia e saber se está adiantado ou atrasado.</p>
            )}

            <div className="grid gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bíblia lida</span>
                <span className="tabular-nums">
                  {r.total_lidos} de {TOTAL_CAPITULOS} · {porcento(r.percentual)}
                </span>
              </div>
              <BarraProgresso
                valor={r.percentual}
                esperado={r.esperado !== null ? r.esperado / TOTAL_CAPITULOS : null}
                rotulo="Capítulos lidos da Bíblia"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {pendente && (
                <Button asChild>
                  <Link to={rotaLeitura(pendente.livro_id, pendente.capitulo)}>
                    <BookOpenIcon />
                    Ler agora · {referencia(livros.data, pendente.livro_id, pendente.capitulo, null, true)}
                  </Link>
                </Button>
              )}
              {(!r.plano || mostrarTrocar) && (
                <Button variant="outline" onClick={() => setPlanoAberto(true)}>
                  <ListChecksIcon />
                  {r.plano ? 'Trocar plano' : 'Escolher plano'}
                </Button>
              )}
              {!mostrarTrocar && r.plano && (
                <Button variant="ghost" asChild>
                  <Link to={ROTAS_PESSOAL.biblia}>Ver livros</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
      <DialogPlano aberto={planoAberto} resumo={r} onFechar={() => setPlanoAberto(false)} />
    </Card>
  )
}
