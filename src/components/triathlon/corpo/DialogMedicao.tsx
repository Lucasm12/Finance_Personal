import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useExcluirPesagem, useSalvarPesagem } from '@/hooks/useTriathlon'
import { dataCurta } from '@/lib/corpo'
import { dataLocal } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Pesagem, PesagemInput } from '@/types/triathlon'

type CampoNumero = Exclude<keyof PesagemInput, 'data' | 'observacao'>

interface InfoCampo {
  rotulo: string
  /** faixa aceita pelo banco */
  min: number
  max: number
  exemplo: string
  dica?: string
}

const CAMPOS: Record<CampoNumero, InfoCampo> = {
  peso_kg: { rotulo: 'Peso (kg)', min: 30, max: 250, exemplo: '74,5' },
  gordura_pct: { rotulo: 'Gordura (%)', min: 3, max: 60, exemplo: '15,2' },
  massa_muscular_kg: { rotulo: 'Massa muscular (kg)', min: 10, max: 150, exemplo: '58,3' },
  agua_pct: { rotulo: 'Água (%)', min: 30, max: 80, exemplo: '58,1' },
  gordura_visceral: { rotulo: 'Gordura visceral (nível)', min: 1, max: 59, exemplo: '6' },
  massa_ossea_kg: { rotulo: 'Massa óssea (kg)', min: 0.5, max: 8, exemplo: '3,1' },
  cintura_cm: { rotulo: 'Cintura (cm)', min: 40, max: 200, exemplo: '82', dica: 'Homens: na altura do umbigo. Mulheres: na parte mais fina.' },
  quadril_cm: { rotulo: 'Quadril (cm)', min: 50, max: 200, exemplo: '98', dica: 'Na parte mais larga do bumbum.' },
  pescoco_cm: { rotulo: 'Pescoço (cm)', min: 20, max: 70, exemplo: '38', dica: 'Logo abaixo do pomo de adão.' },
  braco_cm: { rotulo: 'Braço (cm)', min: 15, max: 70, exemplo: '32', dica: 'Relaxado, no meio entre ombro e cotovelo.' },
  coxa_cm: { rotulo: 'Coxa (cm)', min: 30, max: 100, exemplo: '56', dica: 'No meio da coxa.' },
}

const BIOIMPEDANCIA: CampoNumero[] = ['gordura_pct', 'massa_muscular_kg', 'agua_pct', 'gordura_visceral', 'massa_ossea_kg']
const MEDIDAS: CampoNumero[] = ['cintura_cm', 'quadril_cm', 'pescoco_cm', 'braco_cm', 'coxa_cm']
const NUMEROS = Object.keys(CAMPOS) as CampoNumero[]

type Formulario = Record<CampoNumero, string> & { data: string; observacao: string }

const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

function inicial(p: Partial<Pesagem> | null): Formulario {
  const campos = Object.fromEntries(NUMEROS.map((k) => [k, texto(p?.[k])])) as Record<CampoNumero, string>
  return { ...campos, data: p?.data ?? dataLocal(new Date()), observacao: p?.observacao ?? '' }
}

function Campo({ id, info, valor, onChange }: { id: string; info: InfoCampo; valor: string; onChange: (v: string) => void }) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {info.rotulo}
      </Label>
      <Input id={id} inputMode="decimal" placeholder={info.exemplo} value={valor} onChange={(e) => onChange(e.target.value)} />
      {info.dica && <p className="text-muted-foreground text-[11px] leading-snug">{info.dica}</p>}
    </div>
  )
}

interface FormProps {
  /** medição sendo editada (com id) ou valores iniciais de uma nova */
  medicao: Partial<Pesagem> | null
  pesagens: Pesagem[]
  onFechar: () => void
}

function FormMedicao({ medicao, pesagens, onFechar }: FormProps) {
  const salvar = useSalvarPesagem()
  const excluir = useExcluirPesagem()
  const [f, setF] = useState(() => inicial(medicao))
  const [erro, setErro] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const editando = medicao?.id ? (medicao as Pesagem) : null
  const hoje = dataLocal(new Date())
  // Nova medição numa data que já tem uma: só os campos preenchidos substituem os de lá
  const mesmoDia = !editando ? pesagens.find((p) => p.data === f.data) : null
  const outraNaData = editando && f.data !== editando.data ? pesagens.find((p) => p.data === f.data) : null

  const set = (k: keyof Formulario) => (v: string) => setF((a) => ({ ...a, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.data) return setErro('Informe a data.')
    if (f.data > hoje) return setErro('A data não pode ser no futuro.')
    if (outraNaData) return setErro(`Já existe uma medição em ${dataCurta(f.data)}. Edite aquela ou escolha outra data.`)
    const valores: Partial<Record<CampoNumero, number | null>> = {}
    for (const k of NUMEROS) {
      const t = f[k].trim().replace(',', '.')
      if (!t) {
        valores[k] = null
        continue
      }
      const n = Number(t)
      const info = CAMPOS[k]
      if (!Number.isFinite(n) || n < info.min || n > info.max) {
        return setErro(`${info.rotulo}: informe um valor entre ${texto(info.min)} e ${texto(info.max)}.`)
      }
      valores[k] = n
    }
    if (valores.peso_kg === null) return setErro('Informe o peso.')

    const completos = { ...valores, data: f.data, observacao: f.observacao.trim() || null } as PesagemInput
    // Ao editar, campo vazio apaga o valor; numa nova medição, campo vazio não mexe no que já existe no dia
    const dados = editando
      ? completos
      : (Object.fromEntries(Object.entries(completos).filter(([, v]) => v !== null)) as PesagemInput)
    try {
      await salvar.mutateAsync({ id: editando?.id, dados })
      toast.success(editando ? 'Medição atualizada.' : 'Medição registrada.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  function remover() {
    if (!editando) return
    excluir.mutate(editando.id, { onSuccess: () => toast.success('Medição excluída.') })
    onFechar()
  }

  const grupo = (titulo: string, descricao: string, campos: CampoNumero[]) => (
    <fieldset className="grid gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{titulo}</legend>
      <p className="text-muted-foreground -mt-1 text-xs">{descricao}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {campos.map((k) => (
          <Campo key={k} id={`med-${k}`} info={CAMPOS[k]} valor={f[k]} onChange={set(k)} />
        ))}
      </div>
    </fieldset>
  )

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editando ? `Medição de ${dataCurta(editando.data)}` : 'Nova medição'}</DialogTitle>
        <DialogDescription>Só o peso é obrigatório. Preencha o que tiver: balança de bioimpedância, fita métrica ou os dois.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="med-data" className="text-xs">
            Data
          </Label>
          <Input id="med-data" type="date" max={hoje} value={f.data} onChange={(e) => set('data')(e.target.value)} />
        </div>
        <Campo id="med-peso" info={CAMPOS.peso_kg} valor={f.peso_kg} onChange={set('peso_kg')} />
      </div>
      {mesmoDia && (
        <p className="bg-muted/60 rounded-md px-3 py-2 text-xs">
          Já existe uma medição em {dataCurta(mesmoDia.data)} ({texto(mesmoDia.peso_kg)} kg). Os campos preenchidos aqui
          substituem os dela; os vazios continuam como estão.
        </p>
      )}

      {grupo('Balança de bioimpedância', 'Valores que a balança ou o aplicativo dela mostra.', BIOIMPEDANCIA)}
      {grupo('Circunferências', 'Com fita métrica, de manhã, sem apertar. Cintura e pescoço (e quadril, para mulheres) permitem estimar a % de gordura.', MEDIDAS)}

      <div className="grid gap-1.5">
        <Label htmlFor="med-obs" className="text-xs">
          Observação (opcional)
        </Label>
        <Textarea id="med-obs" rows={2} value={f.observacao} onChange={(e) => set('observacao')(e.target.value)} placeholder="Ex.: em jejum, depois do treino, balança da academia…" />
      </div>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {confirmandoExclusao ? (
        <div className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-3 text-sm">
          <p>Excluir esta medição?</p>
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
        <DialogFooter className={cn(editando && 'sm:justify-between')}>
          {editando && (
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
    </form>
  )
}

interface Props extends FormProps {
  aberto: boolean
}

export function DialogMedicao({ aberto, medicao, pesagens, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {aberto && <FormMedicao key={medicao?.id ?? 'nova'} medicao={medicao} pesagens={pesagens} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  )
}
