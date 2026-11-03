import { useMemo, useState } from 'react'
import { DownloadIcon, LoaderCircleIcon, RepeatIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { usePerfilAtleta } from '@/hooks/useTriathlon'
import { mensagemErro } from '@/lib/erros'
import {
  ehEndurance,
  gerarFit,
  montarTreinoGarmin,
  nomeArquivoFit,
  type AlvoGarmin,
  type DuracaoGarmin,
  type IntensidadeGarmin,
  type TreinoParaExportar,
} from '@/lib/exportacao/garmin'
import { baixar } from '@/lib/exportar'
import { distanciaTexto, tempoTexto } from '@/lib/sugestoes/estrutura'
import { temLimiar } from '@/lib/sugestoes/zonas'
import { formatarPace } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { ModalidadeEndurance } from '@/types/triathlon'

const INTENSIDADE: Record<IntensidadeGarmin, string> = {
  warmup: 'Aquecimento',
  active: 'Esforço',
  recovery: 'Recuperação',
  rest: 'Descanso',
  cooldown: 'Desaquecimento',
}

function duracaoTexto(d: DuracaoGarmin, modalidade: ModalidadeEndurance) {
  if (d.tipo === 'tempo') return tempoTexto(d.seg)
  if (d.tipo === 'distancia') return distanciaTexto(d.m, modalidade)
  return 'até apertar Volta'
}

/** O alvo como o relógio vai cobrar. */
function alvoTexto(a: AlvoGarmin) {
  if (!a) return 'sem alvo'
  if (a.tipo === 'velocidade') return `ritmo ${formatarPace(1000 / a.faixa[1])}–${formatarPace(1000 / a.faixa[0])} /km`
  if (a.tipo === 'potencia') return `${a.faixa[0]}–${a.faixa[1]} W`
  if (a.tipo === 'fc') return `FC ${a.faixa[0]}–${a.faixa[1]}`
  return a.estilo === 'educativo' ? 'educativo' : 'crawl'
}

const dataCurta = (data: string) =>
  new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

interface Props {
  /** treino a exportar (null = fechado) */
  treino: TreinoParaExportar | null
  onFechar: () => void
}

/** Prévia dos passos que vão para o relógio, o download do .fit e como copiar para o Garmin. */
export function DialogExportarGarmin({ treino, onFechar }: Props) {
  const aberto = treino !== null && ehEndurance(treino.modalidade)
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{aberto && <Conteudo treino={treino} />}</DialogContent>
    </Dialog>
  )
}

function Conteudo({ treino }: { treino: TreinoParaExportar }) {
  const perfil = usePerfilAtleta()
  const [piscina, setPiscina] = useState(25)
  const [gerando, setGerando] = useState(false)
  const garmin = useMemo(() => montarTreinoGarmin(treino, perfil.data, { piscina_m: piscina }), [treino, perfil.data, piscina])
  const m = garmin.modalidade
  const passos = garmin.grupos.flatMap((g) => g.passos).filter((p) => p.intensidade !== 'rest')
  const semLimiar = m !== 'natacao' && !temLimiar(m, perfil.data) && passos.some((p) => !p.alvo || p.alvo.tipo === 'fc')

  async function baixarFit() {
    setGerando(true)
    try {
      const bytes = await gerarFit(garmin)
      baixar(new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }), nomeArquivoFit(treino))
      toast.success('Arquivo .fit baixado.', {
        description: 'Copie para a pasta GARMIN › NewFiles do relógio pelo cabo USB (o “Importar dados” do Garmin Connect não aceita treinos).',
        duration: 10_000,
      })
    } catch (e) {
      toast.error('Não foi possível gerar o arquivo.', { description: mensagemErro(e) })
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Levar para o relógio Garmin</DialogTitle>
        <DialogDescription>
          {treino.nome} · {dataCurta(treino.data)}. Vai como treino estruturado (.fit): o relógio mostra cada passo e avisa quando você sai do alvo.
        </DialogDescription>
      </DialogHeader>

      <ol className="grid gap-2" aria-label="Passos no relógio">
        {garmin.grupos.map((g, i) => (
          <li key={i} className={cn('rounded-lg border', g.vezes > 1 && 'border-dashed')}>
            {g.vezes > 1 && (
              <div className="bg-muted/40 flex items-center gap-1.5 border-b px-3 py-1 text-xs font-medium">
                <RepeatIcon className="size-3.5" aria-hidden />
                Repetir {g.vezes}×
              </div>
            )}
            <ul className="divide-y">
              {g.passos.map((p, k) => (
                <li key={k} className="grid gap-0.5 px-3 py-1.5">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="shrink-0 font-semibold tabular-nums">{duracaoTexto(p.duracao, m)}</span>
                    <span className="truncate">{p.nome}</span>
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                    <span>{INTENSIDADE[p.intensidade]}</span>
                    {p.intensidade !== 'rest' && <span className={cn(p.alvo && 'text-foreground font-medium tabular-nums')}>{alvoTexto(p.alvo)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {m === 'natacao' && (
        <div className="grid gap-1.5">
          <Label htmlFor="garmin-piscina" className="text-xs">
            Piscina
          </Label>
          <NativeSelect id="garmin-piscina" value={String(piscina)} onChange={(e) => setPiscina(Number(e.target.value))}>
            <option value="25">25 m</option>
            <option value="50">50 m</option>
          </NativeSelect>
          <p className="text-muted-foreground text-[11px]">Na piscina o relógio guia pela distância e pelo estilo; o ritmo de cada série vai nas notas do passo.</p>
        </div>
      )}
      {semLimiar && (
        <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
          Sem {m === 'corrida' ? 'pace de limiar' : 'FTP'} no Perfil do atleta, os passos vão com alvo de FC (ou sem alvo). Cadastre para o relógio cobrar{' '}
          {m === 'corrida' ? 'o ritmo' : 'a potência'}.
        </p>
      )}

      <div className="bg-muted/50 grid gap-1.5 rounded-lg p-3 text-xs">
        <p className="text-sm font-medium">Como colocar no relógio</p>
        <ol className="grid list-decimal gap-1 pl-4">
          <li>Baixe o arquivo e ligue o relógio no computador pelo cabo USB.</li>
          <li>
            Abra o relógio no Explorador de Arquivos (no Mac, pelo OpenMTP) e copie o arquivo para a pasta <b>GARMIN › NewFiles</b>.
          </li>
          <li>
            Desconecte o cabo. O treino aparece no relógio em <b>Treinamento › Treinos</b> (o caminho muda um pouco de modelo para modelo), com a data na frente do
            nome.
          </li>
        </ol>
        <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-amber-800 dark:text-amber-300">
          Não use o “Importar dados” do Garmin Connect: ele só aceita atividades já feitas e recusa arquivo de treino (“Um de seus arquivos não foi
          aceito”). Treino planejado entra no relógio pela pasta NewFiles.
        </p>
      </div>

      <DialogFooter>
        <Button onClick={baixarFit} disabled={gerando}>
          {gerando ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
          Baixar arquivo .fit
        </Button>
      </DialogFooter>
    </div>
  )
}
