import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useAgendarRotina, useTreinosPlanejados } from '@/hooks/useTriathlon'
import { planejarAgenda, substituivel } from '@/lib/forca/agendamento'
import { avisosConsecutivos, duracaoEstimada, NOMES_DIA, pernasPesadas, SIGLAS_DIA, type ContextoAerobico } from '@/lib/forca/recomendacao'
import { dataLocal, inicioSemana, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { RotinaForca } from '@/types/triathlon'

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

interface FormProps {
  rotina: RotinaForca
  ctx: ContextoAerobico
  /** índice do próximo treino da sequência (depois do último agendado) */
  proximo: number
  onFechar: () => void
}

function FormAgendar({ rotina, ctx, proximo, onFechar }: FormProps) {
  const agendar = useAgendarRotina()
  const hoje = dataLocal(new Date())
  // a partir de quarta, sugere começar na semana seguinte
  const [inicio, setInicio] = useState(() => {
    const atual = inicioSemana(hoje)
    return hoje > somarDias(atual, 1) ? somarDias(atual, 7) : atual
  })
  const [semanas, setSemanas] = useState(4)
  const [dias, setDias] = useState(rotina.dias_semana.length ? rotina.dias_semana : [1, 3, 5])
  const [primeiro, setPrimeiro] = useState(proximo % rotina.treinos.length)
  const [substituir, setSubstituir] = useState(true)
  const duracoes = rotina.treinos.map((t) => duracaoEstimada(t.exercicios))

  const fim = somarDias(inicio, 7 * semanas - 1)
  const agenda = useTreinosPlanejados(inicio, fim)
  const existentes = (agenda.data ?? []).filter((t) => t.modalidade === 'forca' && t.data >= inicio && t.data <= fim)
  const substituiveis = existentes.filter((t) => substituivel(t, hoje)).length
  const plano = planejarAgenda({ inicio, semanas, dias, primeiro, total: rotina.treinos.length, existentes, substituir, hoje })
  const novos = plano.dias.filter((p) => p.indice !== null).length
  const previa = plano.dias.filter((p) => p.data < somarDias(inicio, 14)).map((p) => ({ ...p, treino: p.indice === null ? null : rotina.treinos[p.indice] }))
  const primeiraSemana = previa.flatMap((p) => (p.treino && p.data < somarDias(inicio, 7) ? [{ dia: p.dia, treino: p.treino }] : []))
  const longao = ctx.diaLongao
  const avisos = [
    ...avisosConsecutivos(
      primeiraSemana.map((p) => p.treino),
      primeiraSemana.map((p) => p.dia),
    ),
    ...(longao
      ? primeiraSemana
          .filter((p) => pernasPesadas(p.treino) && (p.dia === longao || p.dia === (longao === 1 ? 7 : longao - 1)))
          .map((p) => `${SIGLAS_DIA[p.dia]}: treino ${p.treino.letra} tem pernas pesadas perto do seu treino longo de ${NOMES_DIA[longao]}.`)
      : []),
  ]

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!dias.length) return toast.error('Escolha pelo menos um dia da semana.')
    if (inicioSemana(inicio) !== inicio) return toast.error('A semana deve começar numa segunda-feira.')
    try {
      const r = await agendar.mutateAsync({ rotina, inicio, semanas, dias, primeiro, duracoes, substituir })
      toast.success(
        `${r.agendados} treino(s) colocados na agenda` +
          (r.substituidos ? `; ${r.substituidos} treino(s) de academia que já estavam foram substituídos` : '') +
          (r.pulados ? `; ${r.pulados} dia(s) já tinham academia e ficaram como estavam` : '') +
          '.',
      )
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Colocar a rotina na agenda</DialogTitle>
        <DialogDescription>
          Os treinos seguem a sequência {rotina.treinos.map((t) => t.letra).join(', ')}. Depois dá para mover, editar ou excluir cada dia no calendário.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ag-inicio" className="text-xs">
            Semana de início (segunda)
          </Label>
          <Input id="ag-inicio" type="date" value={inicio} onChange={(e) => e.target.value && setInicio(inicioSemana(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ag-semanas" className="text-xs">
            Por quantas semanas
          </Label>
          <NativeSelect id="ag-semanas" value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 8].map((n) => (
              <option key={n} value={n}>
                {n} semana{n === 1 ? '' : 's'}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium">Dias da semana</span>
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const ativo = dias.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={ativo}
                onClick={() => setDias(ativo ? dias.filter((x) => x !== d) : [...dias, d])}
                className={cn(
                  'rounded-md border py-1.5 text-xs font-medium transition-colors',
                  ativo ? 'bg-primary text-primary-foreground border-transparent' : 'text-muted-foreground hover:bg-accent',
                  ctx.diaLongao === d && !ativo && 'border-dashed',
                )}
                title={ctx.diaLongao === d ? 'Dia do seu treino longo' : undefined}
              >
                {SIGLAS_DIA[d]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="ag-primeiro" className="text-xs">
          Começar pelo
        </Label>
        <NativeSelect id="ag-primeiro" value={primeiro} onChange={(e) => setPrimeiro(Number(e.target.value))}>
          {rotina.treinos.map((t, i) => (
            <option key={t.letra} value={i}>
              Treino {t.letra} — {t.nome}
              {i === proximo % rotina.treinos.length ? ' (próximo da sequência)' : ''}
            </option>
          ))}
        </NativeSelect>
      </div>

      {substituiveis > 0 && (
        <label className="bg-muted/50 flex items-start gap-2 rounded-md p-3 text-sm">
          <Checkbox className="mt-0.5" checked={substituir} onCheckedChange={(v) => setSubstituir(v === true)} />
          <span>
            Substituir os <strong>{substituiveis}</strong> treino(s) de academia ainda não feitos entre {ddmm(inicio > hoje ? inicio : hoje)} e {ddmm(fim)}.
            Os já feitos ficam como estão.
          </span>
        </label>
      )}

      {previa.length > 0 && (
        <div className="grid gap-1.5">
          <span className="text-xs font-medium">Prévia{semanas > 2 ? ' das 2 primeiras semanas' : ''}</span>
          <ul className="divide-y rounded-lg border text-sm">
            {previa.map((p) => (
              <li key={p.data} className="flex items-center gap-3 px-3 py-1.5">
                <span className="text-muted-foreground w-20 text-xs tabular-nums">
                  {SIGLAS_DIA[p.dia]} {ddmm(p.data)}
                </span>
                {p.treino ? (
                  <>
                    <span className="font-medium">Treino {p.treino.letra}</span>
                    <span className="text-muted-foreground truncate text-xs">{p.treino.nome}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-xs">Já tem academia, fica como está</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {avisos.length > 0 && (
        <ul className="grid gap-1 rounded-lg bg-amber-500/10 p-3">
          {avisos.map((a) => (
            <li key={a} className="flex gap-2 text-xs text-amber-900 dark:text-amber-200">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {a}
            </li>
          ))}
        </ul>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={agendar.isPending || !novos}>
          {agendar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Agendar {novos} treino(s)
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DialogAgendarRotina({ aberto, ...props }: FormProps & { aberto: boolean }) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && props.onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{aberto && <FormAgendar {...props} />}</DialogContent>
    </Dialog>
  )
}
