import { useState, type FormEvent } from 'react'
import { CopyIcon, LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { IconeModalidade } from '@/components/triathlon/LinhaTreino'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useSalvarMetasSemanais } from '@/hooks/useTriathlon'
import { emMetros, MODALIDADES_AGENDA, numeroSemana, textoSemana, UNIDADE, valorMeta } from '@/lib/agenda'
import { MODALIDADES, somarDias } from '@/lib/triathlon'
import type { MetaSemanal, ModalidadeAgenda } from '@/types/triathlon'

type Valores = Record<ModalidadeAgenda, string>

const texto = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

function valoresDa(semana: string, metas: MetaSemanal[]): Valores {
  const v = {} as Valores
  for (const m of MODALIDADES_AGENDA) {
    const meta = metas.find((x) => x.semana === semana && x.modalidade === m)
    v[m] = meta ? texto(valorMeta(meta)) : ''
  }
  return v
}

const REPETIR = [0, 1, 2, 3, 4, 8, 12]

function FormMetas({ semana, metas, onFechar }: { semana: string; metas: MetaSemanal[]; onFechar: () => void }) {
  const salvar = useSalvarMetasSemanais()
  const [valores, setValores] = useState(() => valoresDa(semana, metas))
  const [repetir, setRepetir] = useState(0)
  const [erro, setErro] = useState('')

  function copiarAnterior() {
    const anteriores = valoresDa(somarDias(semana, -7), metas)
    if (MODALIDADES_AGENDA.every((m) => !anteriores[m])) return toast.info('A semana anterior não tem metas.')
    setValores(anteriores)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const resultado = {} as Record<ModalidadeAgenda, Pick<MetaSemanal, 'distancia_m' | 'sessoes'> | null>
    for (const m of MODALIDADES_AGENDA) {
      const t = valores[m].trim().replace(',', '.')
      if (!t) {
        resultado[m] = null
        continue
      }
      const n = Number(t)
      if (m === 'forca') {
        if (!Number.isInteger(n) || n < 1 || n > 21) return setErro('Academia: número inteiro de sessões, de 1 a 21.')
        resultado[m] = { sessoes: n, distancia_m: null }
      } else {
        if (!Number.isFinite(n) || n <= 0) return setErro(`${MODALIDADES[m].nome}: informe uma distância maior que zero.`)
        resultado[m] = { distancia_m: emMetros(m, n), sessoes: null }
      }
    }
    const semanas = Array.from({ length: repetir + 1 }, (_, i) => somarDias(semana, 7 * i))
    try {
      await salvar.mutateAsync({ semanas, metas: resultado })
      toast.success(repetir ? `Metas salvas nesta semana e nas próximas ${repetir}.` : 'Metas da semana salvas.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Metas da semana {numeroSemana(semana)}</DialogTitle>
        <DialogDescription>
          {textoSemana(semana)}. Deixe em branco a modalidade sem meta. Mudar aqui não altera as semanas anteriores.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        {MODALIDADES_AGENDA.map((m) => (
          <div key={m} className="flex items-center gap-3">
            <IconeModalidade modalidade={m} className="size-8" />
            <Label htmlFor={`meta-${m}`} className="flex-1 text-sm">
              {MODALIDADES[m].nome}
            </Label>
            <Input
              id={`meta-${m}`}
              inputMode={m === 'forca' ? 'numeric' : 'decimal'}
              placeholder={UNIDADE[m].exemplo}
              value={valores[m]}
              onChange={(e) => setValores({ ...valores, [m]: e.target.value })}
              className="w-24 text-right"
            />
            <span className="text-muted-foreground w-14 text-sm">{UNIDADE[m].sigla}</span>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={copiarAnterior}>
        <CopyIcon />
        Copiar da semana anterior
      </Button>

      <div className="grid gap-1.5">
        <Label htmlFor="repetir" className="text-xs">
          Aplicar também
        </Label>
        <NativeSelect id="repetir" value={repetir} onChange={(e) => setRepetir(Number(e.target.value))}>
          {REPETIR.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'Só nesta semana' : `Nesta e nas próximas ${n} semana${n === 1 ? '' : 's'}`}
            </option>
          ))}
        </NativeSelect>
        {repetir > 0 && <p className="text-muted-foreground text-[11px]">As metas dessas semanas seguintes são substituídas por estas.</p>}
      </div>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Salvar metas
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DialogMetas({ semana, metas, onFechar }: { semana: string | null; metas: MetaSemanal[]; onFechar: () => void }) {
  return (
    <Dialog open={semana !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md">{semana && <FormMetas key={semana} semana={semana} metas={metas} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}
