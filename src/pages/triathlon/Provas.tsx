import { useState, type FormEvent } from 'react'
import { BikeIcon, FlagIcon, FootprintsIcon, LoaderCircleIcon, MapPinIcon, PlusIcon, Trash2Icon, TrophyIcon, WavesIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useExcluirProva, useProvas, useSalvarProva } from '@/hooks/useTriathlon'
import { dataLocal, diasEntre, duracaoRelogio, fasePreparacao, formatarDecimal, formatarInteiro, lerDuracao, TIPOS_PROVA } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Prova, TipoProva } from '@/types/triathlon'

const PRIORIDADES = {
  A: 'Principal',
  B: 'Importante',
  C: 'Preparatória',
} as const

function Distancias({ p }: { p: Pick<Prova, 'natacao_m' | 'ciclismo_km' | 'corrida_km'> }) {
  const itens = [
    p.natacao_m ? { icone: WavesIcon, texto: `${formatarInteiro(p.natacao_m)} m` } : null,
    p.ciclismo_km ? { icone: BikeIcon, texto: `${formatarDecimal(p.ciclismo_km)} km` } : null,
    p.corrida_km ? { icone: FootprintsIcon, texto: `${formatarDecimal(p.corrida_km)} km` } : null,
  ].filter(Boolean) as { icone: typeof WavesIcon; texto: string }[]
  if (!itens.length) return null
  return (
    <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
      {itens.map((i) => (
        <span key={i.texto} className="flex items-center gap-1">
          <i.icone className="size-3.5" />
          {i.texto}
        </span>
      ))}
    </span>
  )
}

function FormProva({ prova, onFechar }: { prova: Prova | null; onFechar: () => void }) {
  const salvar = useSalvarProva()
  const excluir = useExcluirProva()
  const [nome, setNome] = useState(prova?.nome ?? '')
  const [data, setData] = useState(prova?.data ?? '')
  const [local, setLocal] = useState(prova?.local ?? '')
  const [tipo, setTipo] = useState<TipoProva>(prova?.tipo ?? 'olimpico')
  const [prioridade, setPrioridade] = useState<Prova['prioridade']>(prova?.prioridade ?? 'A')
  const [natacao, setNatacao] = useState(prova?.natacao_m?.toString() ?? String(TIPOS_PROVA.olimpico.natacao_m ?? ''))
  const [ciclismo, setCiclismo] = useState(prova?.ciclismo_km?.toString().replace('.', ',') ?? String(TIPOS_PROVA.olimpico.ciclismo_km ?? ''))
  const [corrida, setCorrida] = useState(prova?.corrida_km?.toString().replace('.', ',') ?? String(TIPOS_PROVA.olimpico.corrida_km ?? ''))
  const [meta, setMeta] = useState(prova?.meta_tempo_seg ? duracaoRelogio(prova.meta_tempo_seg) : '')
  const [resultado, setResultado] = useState(prova?.resultado_tempo_seg ? duracaoRelogio(prova.resultado_tempo_seg) : '')
  const [observacao, setObservacao] = useState(prova?.observacao ?? '')
  const [confirmando, setConfirmando] = useState(false)
  const passada = data && data < dataLocal(new Date())

  function escolherTipo(t: TipoProva) {
    setTipo(t)
    const padrao = TIPOS_PROVA[t]
    setNatacao(padrao.natacao_m?.toString() ?? '')
    setCiclismo(padrao.ciclismo_km?.toString().replace('.', ',') ?? '')
    setCorrida(padrao.corrida_km?.toString().replace('.', ',') ?? '')
  }

  const numero = (t: string) => (t.trim() ? Number(t.replace(',', '.')) : null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !data) return toast.error('Informe o nome e a data da prova.')
    const tempoMeta = meta.trim() ? lerDuracao(meta) : null
    const tempoResultado = resultado.trim() ? lerDuracao(resultado) : null
    if ((meta.trim() && !tempoMeta) || (resultado.trim() && !tempoResultado)) return toast.error('Use o formato h:mm:ss nos tempos.')
    const distancias = [numero(natacao), numero(ciclismo), numero(corrida)]
    if (distancias.some((d) => d !== null && (!Number.isFinite(d) || d < 0))) return toast.error('Distância inválida.')
    try {
      await salvar.mutateAsync({
        id: prova?.id,
        dados: {
          nome: nome.trim(),
          data,
          local: local.trim() || null,
          tipo,
          prioridade,
          natacao_m: distancias[0] === null ? null : Math.round(distancias[0]),
          ciclismo_km: distancias[1],
          corrida_km: distancias[2],
          meta_tempo_seg: tempoMeta,
          resultado_tempo_seg: tempoResultado,
          observacao: observacao.trim() || null,
        },
      })
      toast.success(prova ? 'Prova atualizada.' : 'Prova cadastrada.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{prova ? 'Editar prova' : 'Nova prova-alvo'}</DialogTitle>
        <DialogDescription>A data define a contagem regressiva e a fase sugerida da preparação.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="nome-prova" className="text-xs">
          Nome
        </Label>
        <Input id="nome-prova" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ironman 70.3 Rio" autoFocus={!prova} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="data-prova" className="text-xs">
            Data
          </Label>
          <Input id="data-prova" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="local-prova" className="text-xs">
            Local (opcional)
          </Label>
          <Input id="local-prova" value={local} onChange={(e) => setLocal(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tipo-prova" className="text-xs">
            Tipo
          </Label>
          <NativeSelect id="tipo-prova" value={tipo} onChange={(e) => escolherTipo(e.target.value as TipoProva)}>
            {Object.entries(TIPOS_PROVA).map(([valor, t]) => (
              <option key={valor} value={valor}>
                {t.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prioridade" className="text-xs">
            Prioridade
          </Label>
          <NativeSelect id="prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prova['prioridade'])}>
            {Object.entries(PRIORIDADES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {valor} — {rotulo}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['nat', 'Natação (m)', natacao, setNatacao],
            ['cic', 'Ciclismo (km)', ciclismo, setCiclismo],
            ['cor', 'Corrida (km)', corrida, setCorrida],
          ] as const
        ).map(([id, rotulo, valor, setter]) => (
          <div key={id} className="grid gap-1.5">
            <Label htmlFor={id} className="text-xs">
              {rotulo}
            </Label>
            <Input id={id} inputMode="decimal" value={valor} onChange={(e) => setter(e.target.value)} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="meta" className="text-xs">
            Meta de tempo (h:mm:ss)
          </Label>
          <Input id="meta" inputMode="numeric" placeholder="2:30:00" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="resultado" className="text-xs">
            Resultado {passada ? '' : '(depois da prova)'}
          </Label>
          <Input id="resultado" inputMode="numeric" placeholder="2:27:41" value={resultado} onChange={(e) => setResultado(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="obs-prova" className="text-xs">
          Observação (opcional)
        </Label>
        <Textarea id="obs-prova" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>
      {confirmando ? (
        <div className="border-destructive/40 bg-destructive/5 flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
          Excluir esta prova?
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                excluir.mutate(prova!.id)
                onFechar()
              }}
            >
              Excluir
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className={cn(prova && 'sm:justify-between')}>
          {prova && (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmando(true)}>
              <Trash2Icon />
              Excluir
            </Button>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      )}
    </form>
  )
}

export default function ProvasTriathlon() {
  const provas = useProvas()
  const [editor, setEditor] = useState<{ aberto: boolean; prova: Prova | null }>({ aberto: false, prova: null })
  const hoje = dataLocal(new Date())
  const lista = provas.data ?? []
  const proximas = lista.filter((p) => p.data >= hoje)
  const passadas = lista.filter((p) => p.data < hoje).reverse()

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Provas</h1>
          <p className="text-muted-foreground text-sm">Suas provas-alvo, a contagem regressiva e os resultados.</p>
        </div>
        <Button onClick={() => setEditor({ aberto: true, prova: null })}>
          <PlusIcon />
          Nova prova
        </Button>
      </div>

      {provas.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : lista.length === 0 ? (
        <Card className="items-center gap-2 px-6 py-12 text-center">
          <FlagIcon className="text-primary size-8" />
          <p className="font-medium">Nenhuma prova cadastrada</p>
          <p className="text-muted-foreground text-sm">Cadastre sua prova principal para acompanhar a contagem e a fase do treino.</p>
        </Card>
      ) : (
        <>
          {proximas.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {proximas.map((p) => {
                const dias = diasEntre(hoje, p.data)
                const fase = fasePreparacao(dias)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditor({ aberto: true, prova: p })}
                    className="bg-card hover:border-primary/60 flex gap-4 rounded-xl border p-4 text-left shadow-sm transition-colors"
                  >
                    <div
                      className={cn(
                        'flex size-16 shrink-0 flex-col items-center justify-center rounded-xl',
                        p.prioridade === 'A' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                      )}
                    >
                      <span className="text-2xl leading-none font-bold tabular-nums">{dias}</span>
                      <span className="text-[11px]">{dias === 1 ? 'dia' : 'dias'}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.nome}</span>
                        <Badge variant={p.prioridade === 'A' ? 'default' : 'outline'}>
                          {p.prioridade} · {PRIORIDADES[p.prioridade]}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-2 text-sm">
                        <span>{new Date(`${p.data}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}</span>
                        <span>· {TIPOS_PROVA[p.tipo].nome}</span>
                        {p.local && (
                          <span className="flex items-center gap-0.5">
                            · <MapPinIcon className="size-3" />
                            {p.local}
                          </span>
                        )}
                      </div>
                      <Distancias p={p} />
                      <div className="text-sm">
                        <span className="font-medium">Fase: {fase.nome}</span>
                        {p.meta_tempo_seg && <span className="text-muted-foreground"> · meta {duracaoRelogio(p.meta_tempo_seg)}</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {passadas.length > 0 && (
            <section className="grid gap-2">
              <h2 className="text-muted-foreground text-sm font-medium">Provas realizadas</h2>
              <Card className="gap-0 py-0">
                <ul className="divide-y">
                  {passadas.map((p) => {
                    const dif = p.meta_tempo_seg && p.resultado_tempo_seg ? p.resultado_tempo_seg - p.meta_tempo_seg : null
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setEditor({ aberto: true, prova: p })}
                          className="hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          <TrophyIcon className={cn('size-5 shrink-0', p.resultado_tempo_seg ? 'text-amber-500' : 'text-muted-foreground')} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{p.nome}</div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(`${p.data}T12:00:00`).toLocaleDateString('pt-BR')} · {TIPOS_PROVA[p.tipo].nome}
                            </div>
                          </div>
                          <div className="text-right text-sm tabular-nums">
                            <div className="font-medium">{p.resultado_tempo_seg ? duracaoRelogio(p.resultado_tempo_seg) : 'sem resultado'}</div>
                            {dif !== null && (
                              <div className={cn('text-xs', dif <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                                {dif < 0
                                  ? `${duracaoRelogio(-dif)} abaixo da meta`
                                  : dif === 0
                                    ? 'exatamente na meta'
                                    : `${duracaoRelogio(dif)} acima da meta`}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </section>
          )}
        </>
      )}

      <Dialog open={editor.aberto} onOpenChange={(v) => !v && setEditor({ aberto: false, prova: null })}>
        <DialogContent>
          {editor.aberto && <FormProva key={editor.prova?.id ?? 'nova'} prova={editor.prova} onFechar={() => setEditor({ aberto: false, prova: null })} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
