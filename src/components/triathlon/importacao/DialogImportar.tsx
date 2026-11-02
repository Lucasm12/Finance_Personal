import { useRef, useState } from 'react'
import { CloudDownloadIcon, FileUpIcon, LoaderCircleIcon, SparklesIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { buscarAtividadesAiEndurance, useStatusAiEndurance } from '@/hooks/useAiEndurance'
import { useImportarTreinos, type ResultadoImportacao, type TreinoParaImportar } from '@/hooks/useTriathlon'
import { chaveImportacao, lerArquivos } from '@/lib/importacao/arquivos'
import { buscarExistentes, type Existente } from '@/lib/importacao/duplicidade'
import { mensagemErro } from '@/lib/erros'
import { duracaoCurta, formatarDistancia, MODALIDADES, MODALIDADES_TRI, ORDEM_MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade, ModalidadeEndurance } from '@/types/triathlon'

type Fonte = 'arquivo' | 'ai_endurance'

interface Item extends TreinoParaImportar {
  /** novo: importar? já existe: completar o existente? */
  marcado: boolean
  existente: Existente | null
}

const ORIGEM: Record<Existente['origem'], string> = { manual: 'registrado à mão', arquivo: 'de arquivo', ai_endurance: 'da AI Endurance' }

function resumo(r: ResultadoImportacao): string {
  const partes = [
    r.novos ? `${r.novos} treino(s) importado(s)` : null,
    r.completados ? `${r.completados} completado(s)` : null,
    r.parciais ? `${r.parciais} parciais salvas` : null,
    r.ignorados.length ? `${r.ignorados.length} já existia(m) e ficou(aram) de fora` : null,
  ].filter(Boolean)
  return partes.join(' · ')
}

/** Escolha das modalidades e busca na AI Endurance (estado da integração incluído). */
function PainelAiEndurance({ ativo, lendo, onBuscar }: { ativo: boolean; lendo: boolean; onBuscar: (m: ModalidadeEndurance[]) => void }) {
  const status = useStatusAiEndurance(ativo)
  const [modalidades, setModalidades] = useState<ModalidadeEndurance[]>(['corrida', 'ciclismo', 'natacao'])

  if (status.isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Verificando a integração…
      </div>
    )
  }
  const aviso = status.error
    ? status.error.message
    : !status.data?.configurado
      ? 'A integração com a AI Endurance ainda não foi configurada no servidor. É preciso ter acesso de parceiro (Partner API) e cadastrar AI_ENDURANCE_PARTNER_ID e AI_ENDURANCE_API_KEY na Vercel — passo a passo no README.'
      : !status.data.vinculado
        ? 'Sua conta ainda não está vinculada a um atleta da AI Endurance. O dono do projeto faz o vínculo pelo SQL Editor do Supabase (veja o README).'
        : null
  if (aviso) {
    return (
      <div className="grid gap-2 rounded-lg border border-dashed px-4 py-6 text-sm">
        <p className="font-medium">Importação pela AI Endurance indisponível</p>
        <p className="text-muted-foreground">{aviso}</p>
        <p className="text-muted-foreground">Enquanto isso, importe o arquivo .fit, .tcx ou .gpx exportado do relógio na aba “Arquivo do relógio”.</p>
      </div>
    )
  }
  return (
    <div className="grid gap-3 rounded-lg border px-4 py-4">
      <p className="text-muted-foreground text-sm">Busca as atividades já realizadas que estão na sua conta da AI Endurance, com as voltas e parciais que vierem.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Modalidades">
        {MODALIDADES_TRI.map((m) => {
          const ativa = modalidades.includes(m as ModalidadeEndurance)
          return (
            <label key={m} className={cn('flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm', ativa && 'border-primary bg-primary/5')}>
              <Checkbox
                checked={ativa}
                onCheckedChange={(v) => setModalidades(v === true ? [...modalidades, m as ModalidadeEndurance] : modalidades.filter((x) => x !== m))}
              />
              {MODALIDADES[m].nome}
            </label>
          )
        })}
      </div>
      <Button className="w-fit" onClick={() => onBuscar(modalidades)} disabled={lendo || !modalidades.length}>
        {lendo ? <LoaderCircleIcon className="animate-spin" /> : <CloudDownloadIcon />}
        {lendo ? 'Buscando…' : 'Buscar atividades'}
      </Button>
    </div>
  )
}

export function DialogImportar({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const importar = useImportarTreinos()
  const entrada = useRef<HTMLInputElement>(null)
  const [fonte, setFonte] = useState<Fonte>('arquivo')
  const [itens, setItens] = useState<Item[] | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [lendo, setLendo] = useState(false)
  const [arrastando, setArrastando] = useState(false)

  function fechar() {
    setItens(null)
    setAvisos([])
    onFechar()
  }

  /** Marca o que já existe no app (fica de fora, a não ser que o usuário peça para completar). */
  async function preparar(treinos: TreinoParaImportar[], avisosLeitura: string[]) {
    const existentes = await buscarExistentes(treinos)
    setItens(treinos.map((t, i) => ({ ...t, existente: existentes[i], marcado: !existentes[i] })))
    setAvisos(avisosLeitura)
  }

  async function lerDeArquivos(arquivos: File[]) {
    if (!arquivos.length) return
    setLendo(true)
    try {
      const r = await lerArquivos(arquivos)
      await preparar(
        r.treinos.map((t) => ({ ...t, origem: 'arquivo' as const, origem_id: chaveImportacao(t) })),
        r.avisos,
      )
    } catch (e) {
      setAvisos([mensagemErro(e)])
    } finally {
      setLendo(false)
    }
  }

  async function buscarAie(modalidades: ModalidadeEndurance[]) {
    setLendo(true)
    try {
      const r = await buscarAtividadesAiEndurance(modalidades)
      await preparar(r.treinos, r.avisos.length || r.treinos.length ? r.avisos : ['A AI Endurance não devolveu atividades para essas modalidades.'])
    } catch (e) {
      setAvisos([e instanceof Error ? e.message : mensagemErro(e)])
    } finally {
      setLendo(false)
    }
  }

  const alterar = (i: number, mudanca: Partial<Item>) => setItens((lista) => lista && lista.map((x, j) => (j === i ? { ...x, ...mudanca } : x)))
  const selecionados = (itens ?? []).filter((x) => x.marcado)
  const duplicados = (itens ?? []).filter((x) => x.existente)

  async function confirmar() {
    try {
      const r = await importar.mutateAsync(
        selecionados.map((x) => {
          const t: TreinoParaImportar & Partial<Pick<Item, 'marcado' | 'existente'>> = { ...x, completar: !!x.existente }
          delete t.marcado
          delete t.existente
          return t
        }),
      )
      if (r.novos + r.completados === 0) toast.warning(`Nada novo: ${resumo(r) || 'todos os treinos já existiam'}.`)
      else toast.success(`${resumo(r)}.`)
      fechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar treino</DialogTitle>
          <DialogDescription>
            Traga treinos já realizados, com as parciais (por km, por volta, por piscina). O que já existe no app é avisado e não é duplicado.
          </DialogDescription>
        </DialogHeader>

        {itens === null && (
          <div className="bg-muted flex w-fit gap-1 rounded-lg p-1" role="tablist" aria-label="De onde importar">
            {(
              [
                ['arquivo', 'Arquivo do relógio', FileUpIcon],
                ['ai_endurance', 'AI Endurance', SparklesIcon],
              ] as const
            ).map(([v, rotulo, Icone]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={fonte === v}
                onClick={() => {
                  setFonte(v)
                  setAvisos([])
                }}
                className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', fonte === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Icone className="size-4" />
                {rotulo}
              </button>
            ))}
          </div>
        )}

        {itens === null ? (
          fonte === 'arquivo' ? (
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
                lerDeArquivos(Array.from(e.dataTransfer.files))
              }}
              disabled={lendo}
              className={cn(
                'text-muted-foreground flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-sm transition-colors',
                arrastando ? 'border-primary bg-primary/5' : 'hover:border-primary/60 hover:bg-accent/40',
              )}
            >
              {lendo ? <LoaderCircleIcon className="size-8 animate-spin" /> : <FileUpIcon className="size-8" />}
              <span className="text-foreground font-medium">{lendo ? 'Lendo arquivos…' : 'Toque para escolher ou arraste os arquivos aqui'}</span>
              <span>.fit · .tcx · .gpx (com parciais) · .csv do TrainingPeaks · .zip · .gz</span>
            </button>
          ) : (
            <PainelAiEndurance ativo={aberto && fonte === 'ai_endurance'} lendo={lendo} onBuscar={buscarAie} />
          )
        ) : (
          <div className="grid gap-3">
            <div className="text-sm">
              <strong>{itens.length}</strong> treino(s) encontrado(s) · <strong>{selecionados.length}</strong> para gravar
              {duplicados.length > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {duplicados.length} já existe(m) no app: ficam de fora, a não ser que você marque “completar”
                </span>
              )}
            </div>
            <ul className="max-h-[45dvh] divide-y overflow-y-auto rounded-lg border">
              {itens.map((t, i) => (
                <li key={`${t.origem_id}-${i}`} className="flex items-start gap-3 px-3 py-2">
                  <Checkbox
                    className="mt-1"
                    checked={t.marcado}
                    onCheckedChange={(v) => alterar(i, { marcado: v === true })}
                    aria-label={t.existente ? `Completar o treino existente com ${t.nome}` : `Importar ${t.nome}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{t.nome}</span>
                      {t.existente && <Badge variant="alerta">já existe</Badge>}
                      <Badge variant={t.parciais.length ? 'outline' : 'secondary'}>{t.parciais.length ? `${t.parciais.length} parciais` : 'sem parciais'}</Badge>
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {new Date(t.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {duracaoCurta(t.duracao_seg)}
                      {t.distancia_m ? ` · ${formatarDistancia(t.distancia_m, t.modalidade)}` : ''}
                      {t.fc_media ? ` · FC ${t.fc_media}` : ''}
                      {t.potencia_media ? ` · ${t.potencia_media} W` : ''} · {t.arquivo}
                    </div>
                    {t.existente && (
                      <div className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                        Igual a “{t.existente.nome}” ({ORIGEM[t.existente.origem]}, {new Date(t.existente.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).{' '}
                        {t.marcado ? 'Vai completar esse treino com as medidas e parciais daqui (nome e anotações continuam).' : 'Marque para completar esse treino em vez de ignorar.'}
                      </div>
                    )}
                  </div>
                  <NativeSelect
                    className="w-32 shrink-0"
                    value={t.modalidade}
                    disabled={t.origem === 'ai_endurance'}
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
            lerDeArquivos(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={
              itens
                ? () => {
                    setItens(null)
                    setAvisos([])
                  }
                : fechar
            }
          >
            {itens ? 'Voltar' : 'Cancelar'}
          </Button>
          {itens && (
            <Button type="button" onClick={confirmar} disabled={!selecionados.length || importar.isPending}>
              {importar.isPending && <LoaderCircleIcon className="animate-spin" />}
              Gravar {selecionados.length || ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
