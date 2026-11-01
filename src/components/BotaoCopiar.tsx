import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

async function copiarTexto(texto: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texto)
    return
  }
  // Alternativa para navegadores antigos / http
  const area = document.createElement('textarea')
  area.value = texto
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('cópia não suportada')
}

interface Props {
  texto: string
  rotulo?: string
  className?: string
  /** Mostra o texto "Copiar código" ao lado do ícone. */
  comTexto?: boolean
}

export function BotaoCopiar({ texto, rotulo = 'Copiar código de pagamento', className, comTexto }: Props) {
  const [copiado, setCopiado] = useState(false)

  async function copiar(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await copiarTexto(texto)
      setCopiado(true)
      toast.success('Código copiado!')
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }

  const Icone = copiado ? CheckIcon : CopyIcon

  return (
    <Button
      type="button"
      variant={comTexto ? 'outline' : 'ghost'}
      size={comTexto ? 'sm' : 'icon-sm'}
      aria-label={rotulo}
      title={rotulo}
      onClick={copiar}
      className={cn(copiado && 'text-emerald-600 dark:text-emerald-400', className)}
    >
      <Icone />
      {comTexto && (copiado ? 'Copiado' : 'Copiar código')}
    </Button>
  )
}
