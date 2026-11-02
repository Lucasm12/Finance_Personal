import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { TabelaParciais } from '@/components/triathlon/parciais/TabelaParciais'
import { SeletorModalidade } from '@/components/triathlon/SeletorModalidade'
import { ComparacaoPlano } from '@/components/triathlon/sugestoes/ComparacaoPlano'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useParciais, usePlanejadoDoTreino } from '@/hooks/useParciais'
import { useExcluirTreino, useSalvarTreino } from '@/hooks/useTriathlon'
import {
  cargaTreino,
  dataLocal,
  duracaoRelogio,
  formatarDistancia,
  lerDuracao,
  MODALIDADES,
  ritmoTreino,
} from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade, PerfilAtleta, Treino, TreinoInput } from '@/types/triathlon'

const lerNumero = (texto: string) => {
  const t = texto.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}
const textoNumero = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))
const doisDigitos = (n: number) => String(n).padStart(2, '0')

function horaLocal(iso: string) {
  const d = new Date(iso)
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}

interface Formulario {
  modalidade: Modalidade
  nome: string
  data: string
  hora: string
  duracao: string
  distancia: string
  elevacao: string
  fcMedia: string
  fcMax: string
  potencia: string
  potenciaNormalizada: string
  cadencia: string
  calorias: string
  esforco: number | null
  observacao: string
}

function inicial(t: Treino | null): Formulario {
  const agora = new Date().toISOString()
  return {
    modalidade: t?.modalidade ?? 'corrida',
    nome: t?.nome ?? '',
    data: dataLocal(t?.data_hora ?? agora),
    hora: horaLocal(t?.data_hora ?? agora),
    duracao: t ? duracaoRelogio(t.duracao_seg) : '',
    distancia: t?.distancia_m
      ? textoNumero(t.modalidade === 'natacao' ? t.distancia_m : Math.round(t.distancia_m) / 1000)
      : '',
    elevacao: textoNumero(t?.elevacao_m),
    fcMedia: textoNumero(t?.fc_media),
    fcMax: textoNumero(t?.fc_max),
    potencia: textoNumero(t?.potencia_media),
    potenciaNormalizada: textoNumero(t?.potencia_normalizada),
    cadencia: textoNumero(t?.cadencia_media),
    calorias: textoNumero(t?.calorias),
    esforco: t?.esforco_percebido ?? null,
    observacao: t?.observacao ?? '',
  }
}

const ROTULOS_ESFORCO: Record<number, string> = {
  1: 'Muito leve', 2: 'Leve', 3: 'Leve', 4: 'Moderado', 5: 'Moderado',
  6: 'Forte', 7: 'Forte', 8: 'Muito forte', 9: 'Máximo', 10: 'Máximo',
}

function Resumo({ t, perfil }: { t: Treino; perfil: PerfilAtleta | null | undefined }) {
  const ritmo = ritmoTreino(t)
  const carga = cargaTreino(t, perfil)
  const itens: [string, string | null][] = [
    ['Tempo em movimento', duracaoRelogio(t.duracao_seg)],
    ['Tempo total', t.tempo_total_seg ? duracaoRelogio(t.tempo_total_seg) : null],
    ['Distância', t.distancia_m ? formatarDistancia(t.distancia_m, t.modalidade) : null],
    [t.modalidade === 'ciclismo' ? 'Velocidade média' : 'Ritmo médio', ritmo ? `${ritmo.texto} ${ritmo.unidade}` : null],
    ['Elevação', t.elevacao_m ? `${Math.round(t.elevacao_m)} m` : null],
    ['FC média / máx', t.fc_media ? `${t.fc_media}${t.fc_max ? ` / ${t.fc_max}` : ''} bpm` : null],
    ['Potência média', t.potencia_media ? `${t.potencia_media} W` : null],
    ['Potência normalizada', t.potencia_normalizada ? `${t.potencia_normalizada} W` : null],
    ['Cadência', t.cadencia_media ? `${Math.round(t.cadencia_media)}` : null],
    ['Calorias', t.calorias ? `${t.calorias} kcal` : null],
    ['Carga', `${carga.valor} (${carga.metodo})`],
  ]
  return (
    <dl className="bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-sm sm:grid-cols-3">
      {itens
        .filter(([, v]) => v !== null)
        .map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-muted-foreground text-xs">{rotulo}</dt>
            <dd className="font-medium tabular-nums">{valor}</dd>
          </div>
        ))}
    </dl>
  )
}

function Campo({ id, rotulo, ...props }: { id: string; rotulo: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {rotulo}
      </Label>
      <Input id={id} inputMode="decimal" {...props} />
    </div>
  )
}

interface FormProps {
  treino: Treino | null
  perfil: PerfilAtleta | null | undefined
  onFechar: () => void
}

type Aba = 'parciais' | 'plano' | 'editar'

const ORIGEM: Record<Treino['origem'], string> = { manual: 'registrado à mão', arquivo: 'importado de arquivo', ai_endurance: 'importado da AI Endurance' }

function FormTreino({ treino, perfil, onFechar }: FormProps) {
  const salvar = useSalvarTreino()
  const excluir = useExcluirTreino()
  const [f, setF] = useState(() => inicial(treino))
  const [erro, setErro] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const parciais = useParciais(treino?.id)
  const planejado = usePlanejadoDoTreino(treino?.id)
  const [aba, setAba] = useState<Aba>(treino && treino.origem !== 'manual' ? 'parciais' : 'editar')
  const abas: [Aba, string][] = treino
    ? [
        ['parciais', 'Parciais'],
        ...(planejado.data ? ([['plano', 'Planejado × realizado']] as [Aba, string][]) : []),
        ['editar', 'Editar dados'],
      ]
    : []
  const arquivo = typeof treino?.dados?.arquivo === 'string' ? treino.dados.arquivo : null
  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setF((a) => ({ ...a, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const duracao = lerDuracao(f.duracao)
    const numeros = {
      distancia: lerNumero(f.distancia),
      elevacao: lerNumero(f.elevacao),
      fcMedia: lerNumero(f.fcMedia),
      fcMax: lerNumero(f.fcMax),
      potencia: lerNumero(f.potencia),
      potenciaNormalizada: lerNumero(f.potenciaNormalizada),
      cadencia: lerNumero(f.cadencia),
      calorias: lerNumero(f.calorias),
    }
    if (!duracao) return setErro('Informe a duração (ex.: 45:00 ou 1:20:00).')
    if (Object.values(numeros).some((n) => Number.isNaN(n))) return setErro('Algum número está inválido.')
    if (!f.data || !f.hora) return setErro('Informe data e hora.')
    const inteiro = (n: number | null) => (n === null ? null : Math.round(n))
    const dados: Partial<TreinoInput> = {
      modalidade: f.modalidade,
      nome: f.nome.trim() || `${MODALIDADES[f.modalidade].nome} ${f.data.split('-').reverse().join('/')}`,
      data_hora: new Date(`${f.data}T${f.hora}:00`).toISOString(),
      duracao_seg: duracao,
      distancia_m:
        numeros.distancia === null ? null : f.modalidade === 'natacao' ? numeros.distancia : numeros.distancia * 1000,
      elevacao_m: numeros.elevacao,
      fc_media: inteiro(numeros.fcMedia),
      fc_max: inteiro(numeros.fcMax),
      potencia_media: inteiro(numeros.potencia),
      potencia_normalizada: inteiro(numeros.potenciaNormalizada),
      cadencia_media: numeros.cadencia,
      calorias: inteiro(numeros.calorias),
      esforco_percebido: f.esforco,
      observacao: f.observacao.trim() || null,
      ...(treino ? {} : { origem: 'manual' as const }),
    }
    try {
      const { vinculo } = await salvar.mutateAsync({ id: treino?.id, dados })
      toast.success(treino ? 'Treino atualizado.' : vinculo ? `Treino registrado e “${vinculo.nome}” da Agenda concluído.` : 'Treino registrado.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  function remover() {
    if (!treino) return
    excluir.mutate(treino.id, { onSuccess: () => toast.success('Treino excluído.') })
    onFechar()
  }

  const ehNatacao = f.modalidade === 'natacao'

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{treino ? treino.nome : 'Novo treino'}</DialogTitle>
        <DialogDescription>
          {treino
            ? `${MODALIDADES[treino.modalidade].nome} · ${new Date(treino.data_hora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })} · ${ORIGEM[treino.origem]}${arquivo && treino.origem === 'arquivo' ? ` (${arquivo})` : ''}`
            : 'Preencha os dados do treino à mão (ou use Importar treino para trazer o arquivo do relógio, com as parciais).'}
        </DialogDescription>
      </DialogHeader>

      {treino && <Resumo t={treino} perfil={perfil} />}

      {abas.length > 0 && (
        <div className="border-b" role="tablist" aria-label="Detalhes do treino">
          {abas.map(([v, rotulo]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={aba === v}
              onClick={() => setAba(v)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                aba === v ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {treino && aba === 'parciais' && <TabelaParciais modalidade={treino.modalidade} parciais={parciais.data} carregando={parciais.isLoading} />}
      {treino && aba === 'plano' && planejado.data && (
        <ComparacaoPlano planejado={planejado.data} treino={treino} parciais={parciais.data ?? []} perfil={perfil} />
      )}
      {treino && aba !== 'editar' && (
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      )}

      {(!treino || aba === 'editar') && (
        <>
      <SeletorModalidade value={f.modalidade} onChange={(m) => set('modalidade', m)} />
      <div className="grid gap-1.5">
        <Label htmlFor="nome-treino" className="text-xs">
          Nome (opcional)
        </Label>
        <Input id="nome-treino" value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Longão de domingo" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Campo id="data-treino" rotulo="Data" type="date" inputMode={undefined} value={f.data} onChange={(e) => set('data', e.target.value)} />
        <Campo id="hora-treino" rotulo="Hora" type="time" inputMode={undefined} value={f.hora} onChange={(e) => set('hora', e.target.value)} />
        <Campo id="duracao-treino" rotulo="Duração (h:mm:ss)" placeholder="1:00:00" inputMode="numeric" value={f.duracao} onChange={(e) => set('duracao', e.target.value)} />
        <Campo id="distancia-treino" rotulo={ehNatacao ? 'Distância (m)' : 'Distância (km)'} placeholder={ehNatacao ? '1500' : '10,0'} value={f.distancia} onChange={(e) => set('distancia', e.target.value)} />
        <Campo id="fc-media" rotulo="FC média (bpm)" value={f.fcMedia} onChange={(e) => set('fcMedia', e.target.value)} />
        <Campo id="fc-max" rotulo="FC máxima (bpm)" value={f.fcMax} onChange={(e) => set('fcMax', e.target.value)} />
        {f.modalidade === 'ciclismo' && (
          <>
            <Campo id="potencia" rotulo="Potência média (W)" value={f.potencia} onChange={(e) => set('potencia', e.target.value)} />
            <Campo id="potencia-np" rotulo="Potência normalizada (W)" value={f.potenciaNormalizada} onChange={(e) => set('potenciaNormalizada', e.target.value)} />
          </>
        )}
        {f.modalidade !== 'natacao' && f.modalidade !== 'forca' && (
          <Campo id="elevacao" rotulo="Elevação (m)" value={f.elevacao} onChange={(e) => set('elevacao', e.target.value)} />
        )}
        <Campo id="cadencia" rotulo="Cadência" value={f.cadencia} onChange={(e) => set('cadencia', e.target.value)} />
        <Campo id="calorias" rotulo="Calorias (kcal)" value={f.calorias} onChange={(e) => set('calorias', e.target.value)} />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">
          Esforço percebido {f.esforco ? `— ${f.esforco} (${ROTULOS_ESFORCO[f.esforco]})` : '(opcional)'}
        </Label>
        <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label="Esforço percebido">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={f.esforco === n}
              onClick={() => set('esforco', f.esforco === n ? null : n)}
              className={cn(
                'h-8 rounded-md border text-sm font-medium tabular-nums transition-colors',
                f.esforco !== null && n <= f.esforco
                  ? n >= 8
                    ? 'border-transparent bg-red-500 text-white'
                    : n >= 6
                      ? 'border-transparent bg-amber-500 text-white'
                      : 'bg-primary text-primary-foreground border-transparent'
                  : 'hover:bg-accent text-muted-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="obs-treino" className="text-xs">
          Como foi? (opcional)
        </Label>
        <Textarea id="obs-treino" rows={2} value={f.observacao} onChange={(e) => set('observacao', e.target.value)} placeholder="Sensações, clima, equipamento…" />
      </div>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {confirmandoExclusao ? (
        <div className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-3 text-sm">
          <p>Excluir este treino?</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmandoExclusao(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={remover}>
              Excluir
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className={cn(treino && 'sm:justify-between')}>
          {treino && (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmandoExclusao(true)}>
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
        </>
      )}
    </form>
  )
}

interface Props {
  aberto: boolean
  treino: Treino | null
  perfil: PerfilAtleta | null | undefined
  onFechar: () => void
}

export function DialogTreino({ aberto, treino, perfil, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className={cn('max-h-[92dvh] overflow-y-auto', treino ? 'sm:max-w-3xl' : 'sm:max-w-xl')}>
        {aberto && <FormTreino key={treino?.id ?? 'novo'} treino={treino} perfil={perfil} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  )
}
