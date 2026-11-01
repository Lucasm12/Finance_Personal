import { useNavigate } from 'react-router-dom'
import { LoaderCircleIcon, SparklesIcon, TagsIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useImportarExemplo } from '@/hooks/useDados'
import { competenciaAtual } from '@/lib/format'
import { ROTAS_FINANCEIRO } from '@/modulos'

/** Mostrado quando o usuário ainda não tem nenhuma categoria cadastrada. */
export function BoasVindas() {
  const importar = useImportarExemplo()
  const navigate = useNavigate()
  const ocupado = importar.isPending

  // mutateAsync: esta tela desmonta assim que as categorias chegam,
  // então os avisos não podem depender do componente estar na tela.
  async function importarExemplo() {
    try {
      const r = await importar.mutateAsync({ incluirContas: true, gerarMes: competenciaAtual() })
      toast.success(`${r.contas} contas importadas e ${r.lancamentos} lançamentos gerados para este mês.`)
    } catch {
      // erro já exibido pelo hook
    }
  }

  async function comecarDoZero() {
    try {
      await importar.mutateAsync({ incluirContas: false })
      toast.success('Categorias padrão criadas. Agora cadastre suas contas.')
      navigate(ROTAS_FINANCEIRO.contas)
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Card className="mx-auto mt-4 max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Bem-vindo(a) ao Financeiro!</CardTitle>
        <CardDescription>
          Cadastre suas contas fixas uma vez e o app monta a lista de cada mês sozinho. Como você quer começar?
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={importarExemplo}
          className="hover:border-primary hover:bg-accent/50 flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors disabled:opacity-60"
        >
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-md">
            {ocupado ? <LoaderCircleIcon className="size-5 animate-spin" /> : <SparklesIcon className="size-5" />}
          </span>
          <span className="font-medium">Importar dados de exemplo</span>
          <span className="text-muted-foreground text-sm">
            Cria as 6 categorias e as 22 contas da planilha (Energia, Medplan, Nubank…) e já gera o mês atual.
          </span>
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={comecarDoZero}
          className="hover:border-primary hover:bg-accent/50 flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors disabled:opacity-60"
        >
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-md">
            <TagsIcon className="size-5" />
          </span>
          <span className="font-medium">Começar do zero</span>
          <span className="text-muted-foreground text-sm">
            Cria só as categorias padrão. Você cadastra as próprias contas em seguida.
          </span>
        </button>
      </CardContent>
      <CardContent>
        <Button
          variant="link"
          className="h-auto p-0 text-left whitespace-normal"
          onClick={() => navigate(ROTAS_FINANCEIRO.categorias)}
        >
          <TagsIcon />
          Prefiro criar minhas categorias manualmente
        </Button>
      </CardContent>
    </Card>
  )
}
