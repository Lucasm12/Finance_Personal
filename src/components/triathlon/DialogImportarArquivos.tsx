import { useRef, useState } from 'react'
import { FileUpIcon, LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { useImportarTreinos } from '@/hooks/useTriathlon'
import { lerArquivos, type TreinoLido } from '@/lib/importacaoArquivos'
import { supabase } from '@/lib/supabase'
import { duracaoCurta, formatarDistancia, MODALIDADES, ORDEM_MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade } from '@/types/triathlon'

interface Item extends TreinoLido {
  incluir: boolean
  duplicado: boolean
}

const TOLERANCIA_MS = 3 * 60_000

/** Marca como duplicado o que já existe no app (mesma modalidade, início a até 3 minutos). */
async function marcarDuplicados(treinos: TreinoLido[]): Promise<Item[]> {
  if (!treinos.length) return []
  const tempos = treinos.map((t) => Date.parse(t.data_hora))
  const { data } = await supabase
    .from('treinos')
    .select('data_hora, modalidade')
    .gte('data_hora', new Date(Math.min(...tempos) - TOLERANCIA_MS).toISOString())
    .lte('data_hora', new Date(Math.max(...tempos) + TOLERANCIA_MS).toISOString())
  const existentes = (data ?? []) as { data_hora: string; modalidade: Modalidade }[]
  return treinos.map((t) => {
    const inicio = Date.parse(t.data_hora)
    const duplicado = existentes.some(
      (e) => e.modalidade === t.modalidade && Math.abs(Date.parse(e.data_hora) - inicio) <= TOLERANCIA_MS,
    )
    return { ...t, duplicado, incluir: !duplicado }
  })
}

export function DialogImportarArquivos({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const importar = useImportarTreinos()
  const entrada = useRef<HTMLInputElement>(null)
  const [itens, setItens] = useState<Item[] | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [lendo, setLendo] = useState(false)
  const [arrastando, setArrastando] = useState(false)

  function fechar() {
    setItens(null)
    setAvisos([])
    onFechar()
  }

  async function processar(arquivos: File[]) {
    if (!arquivos.length) return
    setLendo(true)
    try {
      const r = await lerArquivos(arquivos)
      setItens(await marcarDuplicados(r.treinos))
      setAvisos(r.avisos)
    } finally {
      setLendo(false)
    }
  }

  const alterar = (i: number, mudanca: Partial<Item>) =>
    setItens((lista) => lista && lista.map((x, j) => (j === i ? { ...x, ...mudanca } : x)))
  const selecionados = (itens ?? []).filter((x) => x.incluir)

  async function confirmar() {
    try {
      const n = await importar.mutateAsync(selecionados)
      toast.success(`${n} treino(s) importado(s).`)
      fechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar treinos de arquivos</DialogTitle>
          <DialogDescription>
            Arquivos <strong>.fit</strong>, <strong>.tcx</strong> ou <strong>.gpx</strong> do relógio ou do ciclocomputador
            (Garmin, Wahoo, Coros, Polar…), o <strong>.csv</strong> de resumo de treinos do TrainingPeaks ou um
            <strong>.zip</strong> com vários arquivos.
          </DialogDescription>
        </DialogHeader>

        {itens === null ? (
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastando(false)
              processar(Array.from(e.dataTransfer.files))
            }}
            disabled={lendo}
            className={cn(
              'text-muted-foreground flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-sm transition-colors',
              arrastando ? 'border-primary bg-primary/5' : 'hover:border-primary/60 hover:bg-accent/40',
            )}
          >
            {lendo ? <LoaderCircleIcon className="size-8 animate-spin" /> : <FileUpIcon className="size-8" />}
            <span className="text-foreground font-medium">
              {lendo ? 'Lendo arquivos…' : 'Toque para escolher ou arraste os arquivos aqui'}
            </span>
            <span>.fit · .tcx · .gpx · .csv · .zip · .gz</span>
          </button>
        ) : (
          <div className="grid gap-3">
            <div className="text-sm">
              <strong>{itens.length}</strong> treino(s) encontrado(s) · <strong>{selecionados.length}</strong> para importar
              {itens.some((x) => x.duplicado) && (
                <span className="text-muted-foreground"> · os marcados como “já existe” ficam de fora</span>
              )}
            </div>
            <ul className="max-h-[45dvh] divide-y overflow-y-auto rounded-lg border">
              {itens.map((t, i) => (
                <li key={`${t.arquivo}-${t.data_hora}-${i}`} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    checked={t.incluir}
                    onCheckedChange={(v) => alterar(i, { incluir: v === true })}
                    aria-label={`Importar ${t.nome}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{t.nome}</span>
                      {t.duplicado && <Badge variant="alerta">já existe</Badge>}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {new Date(t.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                      {duracaoCurta(t.duracao_seg)}
                      {t.distancia_m ? ` · ${formatarDistancia(t.distancia_m, t.modalidade)}` : ''} · {t.arquivo}
                    </div>
                  </div>
                  <NativeSelect
                    className="w-32 shrink-0"
                    value={t.modalidade}
                    onChange={(e) => alterar(i, { modalidade: e.target.value as Modalidade })}
                    aria-label="Modalidade"
                  >
                    {ORDEM_MODALIDADES.map((m) => (
                      <option key={m} value={m}>
                        {MODALIDADES[m].nome}
                      </option>
                    ))}
                  </NativeSelect>
                </li>
              ))}
              {!itens.length && <li className="text-muted-foreground px-3 py-6 text-center text-sm">Nenhum treino encontrado.</li>}
            </ul>
          </div>
        )}

        {avisos.length > 0 && (
          <ul className="grid gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {avisos.map((a) => (
              <li key={a} className="flex gap-1.5">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        )}

        <input
          ref={entrada}
          type="file"
          multiple
          accept=".fit,.tcx,.gpx,.csv,.zip,.gz"
          className="hidden"
          onChange={(e) => {
            processar(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={itens ? () => setItens(null) : fechar}>
            {itens ? 'Escolher outros arquivos' : 'Cancelar'}
          </Button>
          {itens && (
            <Button type="button" onClick={confirmar} disabled={!selecionados.length || importar.isPending}>
              {importar.isPending && <LoaderCircleIcon className="animate-spin" />}
              Importar {selecionados.length || ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
