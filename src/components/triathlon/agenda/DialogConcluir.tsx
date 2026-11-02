import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FileUpIcon, LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMudarStatusTreino, useTreinosPeriodo, type Conclusao } from '@/hooks/useTriathlon'
import { distanciaTexto, emMetros, naUnidade, UNIDADE } from '@/lib/agenda'
import { dataLocal, duracaoCurta, duracaoRelogio, lerDuracao, MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Treino, TreinoPlanejado } from '@/types/triathlon'

const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(Math.round(n * 100) / 100).replace('.', ','))
const lerNumero = (t: string) => {
  const v = t.trim().replace(',', '.')
  return v ? Number(v) : null
}
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function FormConcluir({ treino: t, onFechar, onImportar }: { treino: TreinoPlanejado; onFechar: () => void; onImportar?: () => void }) {
  const mudar = useMudarStatusTreino()
  const atividades = useTreinosPeriodo(t.data, t.data)
  const candidatas = (atividades.data ?? []).filter((a) => a.modalidade === t.modalidade)
  const academia = t.modalidade === 'forca'
  const hoje = dataLocal(new Date())

  const [vinculo, setVinculo] = useState<string | null>(t.treino_id)
  const [distancia, setDistancia] = useState(() => {
    const m = t.distancia_realizada_m ?? t.distancia_planejada_m
    return m === null || academia ? '' : texto(naUnidade(t.modalidade, m))
  })
  const [duracao, setDuracao] = useState(() => {
    const s = t.duracao_realizada_seg ?? t.duracao_planejada_seg
    return s ? duracaoRelogio(s) : ''
  })
  const [registrar, setRegistrar] = useState(true)
  const [horario, setHorario] = useState(() =>
    t.data === hoje ? new Date().toTimeString().slice(0, 5) : '07:00',
  )
  const [erro, setErro] = useState('')

  function usarAtividade(a: Treino | null) {
    setVinculo(a?.id ?? null)
    if (!a) return
    if (!academia && a.distancia_m) setDistancia(texto(naUnidade(t.modalidade, a.distancia_m)))
    setDuracao(duracaoRelogio(a.duracao_seg))
  }

  // se já existe exatamente uma atividade dessa modalidade no dia, sugere vincular a ela
  const sugeriu = useRef(false)
  useEffect(() => {
    if (sugeriu.current || atividades.isLoading || t.treino_id) return
    sugeriu.current = true
    if (candidatas.length === 1) usarAtividade(candidatas[0])
  }, [atividades.isLoading])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const km = academia ? null : lerNumero(distancia)
    if (km !== null && (!Number.isFinite(km) || km < 0)) return setErro('Distância inválida.')
    const seg = duracao.trim() ? lerDuracao(duracao) : null
    if (duracao.trim() && !seg) return setErro('Duração no formato 45, 45:00 ou 1:20:00.')
    const conclusao: Conclusao = {
      distancia_m: km === null ? null : emMetros(t.modalidade, km),
      duracao_seg: seg,
      treino_id: vinculo,
    }
    if (!vinculo && registrar) {
      if (!seg) return setErro('Para registrar em Treinos, informe a duração.')
      if (!horario) return setErro('Informe o horário do treino.')
      conclusao.registrar = {
        origem: 'manual',
        modalidade: t.modalidade,
        nome: t.nome,
        data_hora: new Date(`${t.data}T${horario}:00`).toISOString(),
        duracao_seg: seg,
        distancia_m: conclusao.distancia_m,
        observacao: t.observacao,
      }
    }
    try {
      await mudar.mutateAsync({ id: t.id, status: 'concluido', conclusao })
      toast.success(conclusao.registrar ? 'Treino concluído e registrado em Treinos.' : 'Treino concluído.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Concluir: {t.nome}</DialogTitle>
        <DialogDescription>
          Informe o que você fez de verdade — é isso que conta para a meta da semana
          {t.distancia_planejada_m ? ` (planejado: ${distanciaTexto(t.modalidade, t.distancia_planejada_m)})` : ''}.
        </DialogDescription>
      </DialogHeader>

      {onImportar && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {candidatas.length ? 'O treino do relógio ainda não está aí?' : 'Tem o arquivo do relógio ou o treino na AI Endurance?'}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onImportar}>
            <FileUpIcon />
            Importar o treino feito
          </Button>
        </div>
      )}

      {candidatas.length > 0 && (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-xs font-medium">Atividade registrada nesse dia</legend>
          {[...candidatas, null].map((a) => (
            <label
              key={a?.id ?? 'nenhuma'}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                vinculo === (a?.id ?? null) && 'border-primary bg-primary/5',
              )}
            >
              <input
                type="radio"
                name="vinculo"
                className="accent-[var(--primary)]"
                checked={vinculo === (a?.id ?? null)}
                onChange={() => usarAtividade(a)}
              />
              {a ? (
                <span className="min-w-0">
                  <span className="font-medium">{a.nome}</span>
                  <span className="text-muted-foreground block text-xs">
                    {hora(a.data_hora)}
                    {a.distancia_m ? ` · ${distanciaTexto(t.modalidade, a.distancia_m)}` : ''} · {duracaoCurta(a.duracao_seg)}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Nenhuma — vou informar os dados</span>
              )}
            </label>
          ))}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        {!academia && (
          <div className="grid gap-1.5">
            <Label htmlFor="real-dist" className="text-xs">
              Distância feita ({UNIDADE[t.modalidade].sigla})
            </Label>
            <Input id="real-dist" inputMode="decimal" value={distancia} onChange={(e) => setDistancia(e.target.value)} />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="real-dur" className="text-xs">
            Duração (h:mm:ss)
          </Label>
          <Input id="real-dur" inputMode="numeric" placeholder="45:00" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </div>
      </div>

      {!vinculo && (
        <div className="grid gap-2 rounded-lg border p-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={registrar} onCheckedChange={(v) => setRegistrar(v === true)} className="mt-0.5" />
            <span>
              Registrar também em Treinos
              <span className="text-muted-foreground block text-xs">
                Entra na carga, na forma e na evolução de {MODALIDADES[t.modalidade].nome.toLowerCase()}. Desmarque se você
                ainda vai importar o arquivo do relógio.
              </span>
            </span>
          </label>
          {registrar && (
            <div className="grid w-32 gap-1.5 pl-6">
              <Label htmlFor="real-hora" className="text-xs">
                Horário
              </Label>
              <Input id="real-hora" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
            </div>
          )}
        </div>
      )}

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mudar.isPending}>
          {mudar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Concluir
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Marca um treino planejado como concluído, com os dados realizados (ou leva para importar o treino feito). */
export function DialogConcluir({ treino, onFechar, onImportar }: { treino: TreinoPlanejado | null; onFechar: () => void; onImportar?: () => void }) {
  return (
    <Dialog open={treino !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md">{treino && <FormConcluir key={treino.id} treino={treino} onFechar={onFechar} onImportar={onImportar} />}</DialogContent>
    </Dialog>
  )
}
