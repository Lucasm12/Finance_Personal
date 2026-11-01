import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CampoMoeda } from '@/components/CampoMoeda'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCriarRendaAvulsa, useSalvarRenda } from '@/hooks/useEconomia'
import { competenciaMedia, hojeISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Competencia, Renda } from '@/types'

type Tipo = 'fixa' | 'avulsa'

interface FormProps {
  renda: Renda | null
  competencia: Competencia
  responsaveis: string[]
  onFechar: () => void
}

function FormRenda({ renda, competencia, responsaveis, onFechar }: FormProps) {
  const salvarRenda = useSalvarRenda()
  const criarAvulsa = useCriarRendaAvulsa()
  const [tipo, setTipo] = useState<Tipo>('fixa')
  const [nome, setNome] = useState(renda?.nome ?? '')
  const [valor, setValor] = useState(renda?.valor_padrao ?? 0)
  const [dia, setDia] = useState(renda?.dia_recebimento?.toString() ?? '')
  const [responsavel, setResponsavel] = useState(renda?.responsavel ?? '')
  const [observacao, setObservacao] = useState(renda?.observacao ?? '')
  const [ativa, setAtiva] = useState(renda?.ativa ?? true)
  const [lancarNoMes, setLancarNoMes] = useState(true)
  const [jaRecebi, setJaRecebi] = useState(false)
  const [erros, setErros] = useState<{ nome?: string; dia?: string; valor?: string }>({})
  const ocupado = salvarRenda.isPending || criarAvulsa.isPending
  const fixa = renda !== null || tipo === 'fixa'

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const novosErros: typeof erros = {}
    if (!nome.trim()) novosErros.nome = fixa ? 'Informe o nome da renda.' : 'Informe a descrição.'
    if (valor <= 0) novosErros.valor = 'Informe o valor.'
    const diaNum = Number(dia)
    if (fixa && dia && (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31)) novosErros.dia = 'Dia entre 1 e 31.'
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    try {
      if (fixa) {
        await salvarRenda.mutateAsync({
          id: renda?.id,
          dados: {
            nome: nome.trim(),
            valor_padrao: valor,
            dia_recebimento: dia ? diaNum : null,
            responsavel: responsavel.trim() || null,
            observacao: observacao.trim() || null,
            ativa,
          },
          lancarEm: !renda && lancarNoMes ? competencia : undefined,
        })
        toast.success(renda ? 'Renda atualizada.' : 'Renda fixa cadastrada.')
      } else {
        await criarAvulsa.mutateAsync({
          descricao: nome.trim(),
          competencia,
          valor,
          recebido: jaRecebi,
          data_recebimento: jaRecebi ? hojeISO() : null,
        })
        toast.success(`Renda lançada em ${competenciaMedia(competencia)}.`)
      }
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{renda ? 'Editar renda fixa' : 'Nova renda'}</DialogTitle>
        <DialogDescription>
          {renda
            ? 'Mudanças valem para os próximos meses gerados. Para mudar só um mês, toque na renda na lista do mês.'
            : 'Salário e outras entradas de dinheiro.'}
        </DialogDescription>
      </DialogHeader>

      {!renda && (
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup" aria-label="Tipo de renda">
          {(
            [
              ['fixa', 'Todo mês'],
              ['avulsa', `Só em ${competenciaMedia(competencia)}`],
            ] as const
          ).map(([valorTipo, rotulo]) => (
            <button
              key={valorTipo}
              type="button"
              role="radio"
              aria-checked={tipo === valorTipo}
              onClick={() => setTipo(valorTipo)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tipo === valorTipo ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="nome-renda">{fixa ? 'Nome' : 'Descrição'}</Label>
        <Input
          id="nome-renda"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={fixa ? 'Ex.: Salário Lucas' : 'Ex.: 13º salário, venda, freela'}
          aria-invalid={!!erros.nome}
          autoFocus={!renda}
        />
        {erros.nome && <p className="text-destructive text-xs">{erros.nome}</p>}
      </div>

      <div className={cn('grid gap-4', fixa && 'sm:grid-cols-2')}>
        <div className="grid gap-2">
          <Label htmlFor="valor-renda">{fixa ? 'Valor por mês' : 'Valor'}</Label>
          <CampoMoeda id="valor-renda" value={valor} onChange={setValor} aria-invalid={!!erros.valor} />
          {erros.valor && <p className="text-destructive text-xs">{erros.valor}</p>}
        </div>
        {fixa && (
          <div className="grid gap-2">
            <Label htmlFor="dia-renda">Dia que cai (opcional)</Label>
            <Input
              id="dia-renda"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="1 a 31"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              aria-invalid={!!erros.dia}
            />
            {erros.dia && <p className="text-destructive text-xs">{erros.dia}</p>}
          </div>
        )}
      </div>

      {fixa ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="responsavel-renda">De quem é (opcional)</Label>
            <Input
              id="responsavel-renda"
              list="lista-responsaveis-renda"
              placeholder="Ex.: Lucas, Débora"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
            <datalist id="lista-responsaveis-renda">
              {responsaveis.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="obs-renda">Observação (opcional)</Label>
            <Textarea id="obs-renda" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          {renda ? (
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="renda-ativa" className="cursor-pointer">
                Renda ativa <span className="text-muted-foreground font-normal">(entra no "Gerar mês")</span>
              </Label>
              <Switch id="renda-ativa" checked={ativa} onCheckedChange={setAtiva} />
            </div>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={lancarNoMes} onCheckedChange={(v) => setLancarNoMes(v === true)} />
              Lançar já em {competenciaMedia(competencia)}
            </label>
          )}
        </>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={jaRecebi} onCheckedChange={(v) => setJaRecebi(v === true)} />
          Já recebi
        </label>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={ocupado}>
          {ocupado && <LoaderCircleIcon className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  aberto: boolean
  renda: Renda | null
  competencia: Competencia
  responsaveis: string[]
  onFechar: () => void
}

export function DialogRenda({ aberto, renda, competencia, responsaveis, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        {aberto && (
          <FormRenda
            key={renda?.id ?? 'nova'}
            renda={renda}
            competencia={competencia}
            responsaveis={responsaveis}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
