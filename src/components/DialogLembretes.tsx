import { useState, type FormEvent } from 'react'
import { BellIcon, LoaderCircleIcon, SendIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useEnviarLembreteTeste, useLembrete, useSalvarLembrete } from '@/hooks/useDados'
import type { LembreteEmail, StatusLembrete } from '@/types'

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Traduz a resposta do Resend para uma mensagem útil. */
function explicarFalha(status: StatusLembrete): string {
  if (status.erro) return `Falha de conexão com o Resend: ${status.erro}`
  let mensagem = status.resposta ?? ''
  try {
    mensagem = JSON.parse(mensagem).message ?? mensagem
  } catch {
    // resposta não era JSON
  }
  const soProprio = mensagem.match(/only send testing emails to your own email address \(([^)]+)\)/i)
  if (soProprio) {
    return `Sem domínio próprio, o Resend só envia para o e-mail da sua conta no Resend (${soProprio[1]}). Use esse e-mail aqui ou verifique um domínio no Resend.`
  }
  if (/api key is invalid/i.test(mensagem)) return 'A chave do Resend (resend_api_key) é inválida. Cadastre-a de novo no Vault.'
  return `O Resend recusou o envio (${status.status}): ${mensagem}`
}

function FormLembrete({ lembrete, onFechar }: { lembrete: LembreteEmail | null; onFechar: () => void }) {
  const { usuario } = useAuth()
  const salvar = useSalvarLembrete()
  const testar = useEnviarLembreteTeste()
  const [email, setEmail] = useState(lembrete?.email ?? usuario?.email ?? '')
  const [ativo, setAtivo] = useState(lembrete?.ativo ?? true)
  const [erro, setErro] = useState('')
  const ocupado = salvar.isPending || testar.isPending

  function validar() {
    const valido = EMAIL_VALIDO.test(email.trim())
    setErro(valido ? '' : 'Informe um e-mail válido.')
    return valido
  }

  async function gravar() {
    await salvar.mutateAsync({ email: email.trim(), ativo })
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!validar()) return
    try {
      await gravar()
      toast.success(ativo ? 'Lembrete salvo.' : 'Lembrete desativado.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  async function enviarTeste() {
    if (!validar()) return
    try {
      await gravar()
      const status = await testar.mutateAsync()
      if (!status) toast.info('Envio em processamento. Confira sua caixa de entrada (e o spam) em instantes.')
      else if (status.status && status.status < 300) toast.success(`E-mail de teste enviado para ${email.trim()}.`)
      else toast.error(explicarFalha(status), { duration: 12000 })
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BellIcon className="size-5" />
          Lembretes por e-mail
        </DialogTitle>
        <DialogDescription>
          Enviamos a lista das contas não pagas do mês nos dias <strong>1, 6, 11, 16, 21 e 26</strong>, às 8h. Quando
          está tudo pago, nenhum e-mail é enviado.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="email-lembrete">Enviar para</Label>
        <Input
          id="email-lembrete"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setErro('')
          }}
          aria-invalid={!!erro}
        />
        {erro && <p className="text-destructive text-xs">{erro}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
        <Label htmlFor="lembrete-ativo" className="cursor-pointer">
          Lembretes ativos
        </Label>
        <Switch id="lembrete-ativo" checked={ativo} onCheckedChange={setAtivo} />
      </div>

      {lembrete?.ultimo_envio && (
        <p className="text-muted-foreground text-xs">
          Último envio:{' '}
          {new Date(lembrete.ultimo_envio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={enviarTeste} disabled={ocupado}>
          {testar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
          {testar.isPending ? 'Enviando…' : 'Enviar teste agora'}
        </Button>
        <Button type="submit" disabled={ocupado}>
          {salvar.isPending && !testar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}

export function DialogLembretes({ aberto, onAbertoChange }: Props) {
  const lembrete = useLembrete(aberto)

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        {lembrete.isPending ? (
          <div className="grid gap-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-16" />
            <Skeleton className="h-9" />
          </div>
        ) : lembrete.isError ? (
          <DialogHeader>
            <DialogTitle>Lembretes indisponíveis</DialogTitle>
            <DialogDescription>
              Não foi possível carregar a configuração. Verifique se o arquivo
              <code className="mx-1">20261031130000_lembretes_email.sql</code>
              já foi executado no Supabase.
            </DialogDescription>
          </DialogHeader>
        ) : (
          aberto && <FormLembrete lembrete={lembrete.data ?? null} onFechar={() => onAbertoChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
