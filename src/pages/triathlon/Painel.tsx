import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  FileUpIcon,
  FlagIcon,
  PlusIcon,
  ScaleIcon,
  UserCogIcon,
} from 'lucide-react'

import { CardAgendaHoje } from '@/components/triathlon/agenda/CardAgendaHoje'
import { DialogImportar } from '@/components/triathlon/importacao/DialogImportar'
import { DialogTreino } from '@/components/triathlon/DialogTreino'
import { IconeModalidade, LinhaTreino } from '@/components/triathlon/LinhaTreino'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePerfilAtleta, usePesagens, useProvas, useTreinosRecentes } from '@/hooks/useTriathlon'
import { classificar, dataCurta, ESCALA_IMC, formatarValor, imcDe, mediaPlanejada, planoDoPerfil, semanaDoPlano } from '@/lib/corpo'
import {
  dataLocal,
  diasEntre,
  duracaoCurta,
  fasePreparacao,
  formatarDecimal,
  formatarDistancia,
  inicioSemana,
  lerForma,
  MODALIDADES,
  MODALIDADES_TRI,
  pesoEm,
  serieForma,
  somarDias,
  TIPOS_PROVA,
  totaisPorModalidade,
} from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import { ROTAS_TRIATHLON as ROTAS_TRI } from '@/modulos'
import type { Treino } from '@/types/triathlon'

const TOM: Record<string, string> = {
  bom: 'text-emerald-700 dark:text-emerald-400',
  neutro: 'text-foreground',
  alerta: 'text-amber-700 dark:text-amber-400',
  perigo: 'text-red-700 dark:text-red-400',
}

export default function PainelTriathlon() {
  const treinos = useTreinosRecentes()
  const perfil = usePerfilAtleta()
  const pesagens = usePesagens()
  const provas = useProvas()
  const [editor, setEditor] = useState<{ aberto: boolean; treino: Treino | null }>({ aberto: false, treino: null })
  const [importando, setImportando] = useState(false)

  const hoje = dataLocal(new Date())
  const lista = treinos.data ?? []
  const limiares = perfil.data

  const semana = inicioSemana(hoje)
  const dados = useMemo(() => {
    const desta = lista.filter((t) => dataLocal(t.data_hora) >= semana)
    const anterior = lista.filter((t) => {
      const d = dataLocal(t.data_hora)
      return d >= somarDias(semana, -7) && d < semana
    })
    const forma = serieForma(lista, limiares, somarDias(hoje, -1), hoje).at(-1)
    return {
      desta: totaisPorModalidade(desta, limiares),
      anterior: totaisPorModalidade(anterior, limiares),
      horasDesta: desta.reduce((s, t) => s + t.duracao_seg, 0),
      horasAnterior: anterior.reduce((s, t) => s + t.duracao_seg, 0),
      forma,
    }
  }, [lista, limiares, semana, hoje])

  // Destaca a prova principal (A); a fase do treino é contada até ela
  const futuras = (provas.data ?? []).filter((p) => p.data >= hoje)
  const proxima = futuras.find((p) => p.prioridade === 'A') ?? futuras[0]
  const antes = futuras[0] && futuras[0] !== proxima ? futuras[0] : null
  const listaPesagens = pesagens.data ?? []
  const pesoAtual = listaPesagens.at(-1)
  const peso30 = pesoAtual ? pesoEm(listaPesagens, somarDias(hoje, -30)) : null
  const wkg = perfil.data?.ftp_w && pesoAtual ? perfil.data.ftp_w / pesoAtual.peso_kg : null
  const imc = pesoAtual && perfil.data?.altura_cm ? classificar(imcDe(pesoAtual.peso_kg, perfil.data.altura_cm), ESCALA_IMC) : null
  // meta da semana do plano de peso (página Corpo)
  const plano = planoDoPerfil(perfil.data)
  const semanaPlano = plano ? semanaDoPlano(plano, hoje) : null
  const metaSemana =
    plano && semanaPlano && semanaPlano <= Math.ceil(plano.semanas)
      ? { kg: mediaPlanejada(plano, somarDias(plano.inicio, 7 * semanaPlano)), ate: somarDias(plano.inicio, 7 * semanaPlano), sentido: plano.sentido }
      : null

  const carregando = treinos.isLoading || perfil.isLoading
  const semNada = !carregando && lista.length === 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportando(true)}>
            <FileUpIcon />
            Importar treino
          </Button>
          <Button onClick={() => setEditor({ aberto: true, treino: null })}>
            <PlusIcon />
            Novo treino
          </Button>
        </div>
      </div>

      {semNada && (
        <Card>
          <CardHeader>
            <CardTitle>Vamos começar</CardTitle>
            <CardDescription>Traga seus treinos e configure seu perfil para os cálculos de carga e evolução.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { para: ROTAS_TRI.treinos, titulo: 'Treinos', texto: 'Registre à mão ou importe arquivos .fit, .tcx e .gpx.', icone: FileUpIcon },
              { para: ROTAS_TRI.corpo, titulo: 'Peso e altura', texto: 'IMC, % de gordura, medidas e faixas de referência.', icone: ScaleIcon },
              { para: ROTAS_TRI.perfil, titulo: 'Perfil do atleta', texto: 'FTP, limiares e metas de nutrição.', icone: UserCogIcon },
              { para: ROTAS_TRI.provas, titulo: 'Prova-alvo', texto: 'Contagem regressiva e fase do treino.', icone: FlagIcon },
            ].map((p) => (
              <Link key={p.titulo} to={p.para} className="hover:border-primary hover:bg-accent/40 grid gap-1 rounded-lg border p-3 transition-colors">
                <p.icone className="text-primary size-5" />
                <span className="font-medium">{p.titulo}</span>
                <span className="text-muted-foreground text-xs">{p.texto}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Próxima prova */}
      {proxima ? (
        <Card className="gap-3 px-5 py-4">
          {(() => {
            const dias = diasEntre(hoje, proxima.data)
            const fase = fasePreparacao(dias)
            return (
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-primary/10 text-primary flex size-16 shrink-0 flex-col items-center justify-center rounded-xl">
                  <span className="text-2xl leading-none font-bold tabular-nums">{dias}</span>
                  <span className="text-[11px]">{dias === 1 ? 'dia' : 'dias'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{proxima.nome}</span>
                    <Badge variant={proxima.prioridade === 'A' ? 'default' : 'outline'}>Prova {proxima.prioridade}</Badge>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {new Date(`${proxima.data}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'long' })} · {TIPOS_PROVA[proxima.tipo].nome} ·{' '}
                    {Math.ceil(dias / 7)} semana(s)
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-medium">Fase: {fase.nome}.</span> <span className="text-muted-foreground">{fase.descricao}</span>
                  </div>
                  {antes && (
                    <div className="text-muted-foreground mt-1 text-xs">
                      Antes dela: {antes.nome} em {diasEntre(hoje, antes.data)} dias (prova {antes.prioridade})
                    </div>
                  )}
                </div>
                <Link to={ROTAS_TRI.provas} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}>
                  Provas
                  <ChevronRightIcon />
                </Link>
              </div>
            )
          })()}
        </Card>
      ) : (
        !semNada &&
        !provas.isLoading && (
          <Link to={ROTAS_TRI.provas} className="hover:bg-accent/40 flex items-center gap-3 rounded-xl border border-dashed px-5 py-3 text-sm transition-colors">
            <FlagIcon className="text-primary size-5" />
            <span>
              <strong>Defina sua prova-alvo</strong> <span className="text-muted-foreground">para ver a contagem regressiva e a fase do treino.</span>
            </span>
          </Link>
        )
      )}

      {/* Esta semana */}
      {carregando ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <section aria-label="Esta semana" className="grid gap-2">
          <h2 className="text-muted-foreground text-sm font-medium">Esta semana</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {MODALIDADES_TRI.map((m) => {
              const t = dados.desta[m]
              const antes = dados.anterior[m]
              return (
                <Card key={m} className="gap-2 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <IconeModalidade modalidade={m} className="size-7" />
                    <span className="text-sm font-medium">{MODALIDADES[m].nome}</span>
                  </div>
                  <div className="text-xl font-semibold tracking-tight">{t.distancia ? formatarDistancia(t.distancia, m) : '—'}</div>
                  <div className="text-muted-foreground text-xs">
                    {t.quantidade} treino(s) · {duracaoCurta(t.duracao)}
                    {antes.duracao > 0 && (
                      <span className="block">semana passada: {duracaoCurta(antes.duracao)}</span>
                    )}
                  </div>
                </Card>
              )
            })}
            <Card className="gap-2 px-4 py-4">
              <div className="text-sm font-medium">Total da semana</div>
              <div className="text-xl font-semibold tracking-tight">{duracaoCurta(dados.horasDesta)}</div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                {dados.horasAnterior > 0 ? (
                  <>
                    {dados.horasDesta >= dados.horasAnterior ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
                    {duracaoCurta(Math.abs(dados.horasDesta - dados.horasAnterior))} vs. semana passada
                  </>
                ) : (
                  'sem treinos na semana passada'
                )}
              </div>
            </Card>
          </div>
        </section>
      )}

      {!carregando && <CardAgendaHoje />}

      {/* Forma */}
      {dados.forma && lista.length > 0 && (
        <Card className="gap-3 px-5 py-4">
          {(() => {
            const leitura = lerForma(dados.forma.tsb)
            const blocos = [
              { rotulo: 'Condicionamento', valor: dados.forma.ctl, dica: 'carga média dos últimos 42 dias' },
              { rotulo: 'Fadiga', valor: dados.forma.atl, dica: 'carga média dos últimos 7 dias' },
              // convenção do modelo: a forma do dia é o saldo com que você acordou (antes dos treinos de hoje)
              { rotulo: 'Forma', valor: dados.forma.tsb, dica: 'condicionamento − fadiga ao fim de ontem' },
            ]
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">Sua forma hoje</div>
                    <div className={cn('text-lg font-semibold', TOM[leitura.tom])}>{leitura.rotulo}</div>
                    <div className="text-muted-foreground text-sm">{leitura.descricao}</div>
                  </div>
                  <Link to={ROTAS_TRI.evolucao} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                    Evolução
                    <ChevronRightIcon />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {blocos.map((b) => (
                    <div key={b.rotulo} className="bg-muted/40 rounded-lg px-3 py-2">
                      <div className="text-muted-foreground text-xs">{b.rotulo}</div>
                      <div className="text-lg font-semibold tabular-nums">{Math.round(b.valor)}</div>
                      <div className="text-muted-foreground text-[11px] leading-tight">{b.dica}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-3">
        <Card className="gap-0 overflow-hidden py-0 lg:col-span-2">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-semibold">Últimos treinos</h2>
            <Link to={ROTAS_TRI.treinos} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Todos
              <ChevronRightIcon />
            </Link>
          </div>
          {carregando ? (
            <div className="grid gap-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : lista.length === 0 ? (
            <p className="text-muted-foreground border-t px-4 py-8 text-center text-sm">Nenhum treino ainda.</p>
          ) : (
            <ul className="divide-y border-t">
              {lista.slice(0, 6).map((t) => (
                <LinhaTreino key={t.id} treino={t} perfil={limiares} onAbrir={(x) => setEditor({ aberto: true, treino: x })} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-2 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <ScaleIcon className="text-primary size-4" />
              Peso
            </h2>
            <Link to={ROTAS_TRI.corpo} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Corpo
              <ChevronRightIcon />
            </Link>
          </div>
          {pesoAtual ? (
            <>
              <div className="text-3xl font-semibold tracking-tight">{formatarDecimal(pesoAtual.peso_kg)} kg</div>
              <div className="text-muted-foreground text-sm">
                em {pesoAtual.data.split('-').reverse().join('/')}
                {peso30 !== null && peso30 !== pesoAtual.peso_kg && (
                  <>
                    {' · '}
                    {pesoAtual.peso_kg < peso30 ? '−' : '+'}
                    {formatarDecimal(Math.abs(pesoAtual.peso_kg - peso30))} kg em 30 dias
                  </>
                )}
              </div>
              {imc && (
                <div className="text-sm">
                  IMC: <strong>{formatarValor(imc.valor, imc.escala)}</strong>
                  <span className="text-muted-foreground"> ({imc.faixa.rotulo.toLowerCase()})</span>
                </div>
              )}
              {perfil.data?.peso_meta_kg && (
                <div className="text-sm">
                  Meta: {formatarDecimal(perfil.data.peso_meta_kg)} kg
                  <span className="text-muted-foreground">
                    {' '}
                    (faltam {formatarDecimal(Math.abs(pesoAtual.peso_kg - perfil.data.peso_meta_kg))} kg)
                  </span>
                </div>
              )}
              {metaSemana && (
                <div className="text-sm">
                  Meta desta semana: média {metaSemana.sentido < 0 ? 'até' : 'de pelo menos'} <strong>{formatarValor(metaSemana.kg, { casas: 1 })} kg</strong>
                  <span className="text-muted-foreground"> (semana termina em {dataCurta(metaSemana.ate).slice(0, 5)})</span>
                </div>
              )}
              {wkg && (
                <div className="text-sm">
                  Potência relativa: <strong>{wkg.toFixed(2).replace('.', ',')} W/kg</strong>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Registre seu peso e sua altura em <Link to={ROTAS_TRI.corpo} className="text-primary underline">Corpo</Link>.
            </p>
          )}
        </Card>
      </div>

      <DialogTreino
        aberto={editor.aberto}
        treino={editor.treino}
        perfil={limiares}
        onFechar={() => setEditor({ aberto: false, treino: null })}
      />
      <DialogImportar aberto={importando} onFechar={() => setImportando(false)} />
    </div>
  )
}
