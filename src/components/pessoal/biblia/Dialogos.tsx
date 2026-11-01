import { useState, type FormEvent } from 'react'
import { CheckCircle2Icon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useDesmarcarVersiculo, useMarcarVersiculo, useSalvarAnotacao } from '@/hooks/useBiblia'
import { CORES_MARCACAO } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import type { CorMarcacao, Versiculo, VersiculoMarcado } from '@/types/pessoal'

// -----------------------------------------------------------------------------
// Anotação ao concluir o capítulo (opcional)
// -----------------------------------------------------------------------------

function FormAnotacao({
  livro,
  capitulo,
  titulo,
  versiculos,
  onFim,
}: {
  livro: number
  capitulo: number
  titulo: string
  versiculos: Versiculo[]
  onFim: () => void
}) {
  const salvar = useSalvarAnotacao()
  const [destaque, setDestaque] = useState('')
  const [reflexao, setReflexao] = useState('')
  const [aplicacao, setAplicacao] = useState('')
  const texto = versiculos.find((v) => String(v.versiculo) === destaque)?.texto
  const vazio = !destaque && !reflexao.trim() && !aplicacao.trim()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (vazio) return onFim()
    try {
      await salvar.mutateAsync({
        livro_id: livro,
        capitulo,
        versiculo_destaque: destaque ? Number(destaque) : null,
        reflexao: reflexao.trim() || null,
        aplicacao: aplicacao.trim() || null,
      })
      toast.success('Anotação salva.')
      onFim()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
          {titulo} concluído
        </DialogTitle>
        <DialogDescription>Quer anotar algo? É opcional: pule para ir direto ao próximo capítulo.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="anotacao-versiculo">Versículo que mais marcou</Label>
        <NativeSelect id="anotacao-versiculo" value={destaque} onChange={(e) => setDestaque(e.target.value)}>
          <option value="">Nenhum</option>
          {versiculos.map((v) => (
            <option key={v.id} value={v.versiculo}>
              {v.versiculo}. {v.texto.length > 60 ? `${v.texto.slice(0, 60)}…` : v.texto}
            </option>
          ))}
        </NativeSelect>
        {texto && <p className="text-muted-foreground border-l-2 pl-2 text-xs italic">{texto}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="anotacao-reflexao">Reflexão</Label>
        <Textarea id="anotacao-reflexao" rows={3} maxLength={4000} value={reflexao} onChange={(e) => setReflexao(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="anotacao-aplicacao">Aplicação prática</Label>
        <Textarea
          id="anotacao-aplicacao"
          rows={2}
          maxLength={4000}
          placeholder="O que vou fazer diferente a partir disso?"
          value={aplicacao}
          onChange={(e) => setAplicacao(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFim}>
          Pular
        </Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          {vazio ? 'Continuar' : 'Salvar e continuar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DialogAnotacao({
  aberto,
  onFim,
  ...props
}: {
  aberto: boolean
  livro: number
  capitulo: number
  titulo: string
  versiculos: Versiculo[]
  onFim: () => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFim()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{aberto && <FormAnotacao {...props} onFim={onFim} />}</DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Marcação colorida de versículo
// -----------------------------------------------------------------------------

function FormMarcacao({
  referencia,
  versiculo,
  marcacao,
  onFechar,
}: {
  referencia: string
  versiculo: Versiculo
  marcacao: VersiculoMarcado | undefined
  onFechar: () => void
}) {
  const marcar = useMarcarVersiculo()
  const desmarcar = useDesmarcarVersiculo()
  const [cor, setCor] = useState<CorMarcacao>(marcacao?.cor ?? 'amarelo')
  const [nota, setNota] = useState(marcacao?.nota ?? '')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      await marcar.mutateAsync({ versiculo_id: versiculo.id, cor, nota: nota.trim() || null })
      toast.success(marcacao ? 'Marcação atualizada.' : 'Versículo salvo em “Meus versículos”.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  function remover() {
    if (!marcacao) return
    desmarcar.mutate(marcacao.id, { onSuccess: () => toast.success('Marcação removida.') })
    onFechar()
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{referencia}</DialogTitle>
        <DialogDescription className={cn('text-foreground rounded-md px-2 py-1 text-sm leading-relaxed', CORES_MARCACAO[cor].fundo)}>
          {versiculo.texto}
        </DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Cor</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CORES_MARCACAO) as CorMarcacao[]).map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="cor" value={c} checked={cor === c} onChange={() => setCor(c)} className="peer sr-only" />
              <span
                className={cn(
                  'peer-focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs peer-focus-visible:ring-[3px]',
                  cor === c && 'border-foreground',
                )}
              >
                <span className={cn('size-3 rounded-full', CORES_MARCACAO[c].amostra)} aria-hidden />
                {CORES_MARCACAO[c].rotulo}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="marcacao-nota">Nota (opcional)</Label>
        <Textarea id="marcacao-nota" rows={2} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>

      <DialogFooter className="sm:justify-between">
        {marcacao ? (
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={remover}>
            <Trash2Icon />
            Remover marcação
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={marcar.isPending}>
            {marcar.isPending && <LoaderCircleIcon className="animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

export function DialogMarcacao({
  versiculo,
  ...props
}: {
  referencia: string
  versiculo: Versiculo | null
  marcacao: VersiculoMarcado | undefined
  onFechar: () => void
}) {
  return (
    <Dialog open={Boolean(versiculo)} onOpenChange={(v) => !v && props.onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">{versiculo && <FormMarcacao versiculo={versiculo} {...props} />}</DialogContent>
    </Dialog>
  )
}
