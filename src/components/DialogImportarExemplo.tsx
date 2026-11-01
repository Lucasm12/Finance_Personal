import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useImportarExemplo } from '@/hooks/useDados'

interface Props {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
}

export function DialogImportarExemplo({ aberto, onAbertoChange }: Props) {
  const importar = useImportarExemplo()

  async function confirmar() {
    try {
      const { categorias, contas } = await importar.mutateAsync({ incluirContas: true })
      if (categorias === 0 && contas === 0) toast.info('Os dados de exemplo já estavam cadastrados.')
      else toast.success(`Importado: ${categorias} categoria(s) e ${contas} conta(s). Use "Gerar mês" para lançá-las.`)
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <AlertDialog open={aberto} onOpenChange={onAbertoChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Importar dados de exemplo?</AlertDialogTitle>
          <AlertDialogDescription>
            Serão cadastradas as categorias (Moradia, Transporte, Cartões/Empréstimo, Saúde, Contabilidade e Outro) e as
            22 contas da planilha. O que já existir com o mesmo nome não é duplicado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar}>Importar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
