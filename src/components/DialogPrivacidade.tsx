import { useState, type FormEvent } from 'react'
import { DownloadIcon, LoaderCircleIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exportarMeusDados, useExcluirConta } from '@/hooks/usePrivacidade'

/** O que o app guarda e para quê (finalidade de cada dado). */
const DADOS: [string, string][] = [
  ['Conta', 'E-mail e senha (guardada pelo Supabase com bcrypt, nunca em texto) — para entrar.'],
  ['Financeiro', 'Contas, lançamentos, rendas e caixinhas — para o controle do mês.'],
  ['Lembrete', 'E-mail que recebe o aviso de contas pendentes — só para esse envio.'],
  ['Treinos e agenda', 'Treinos feitos e planejados, metas, provas e cargas da musculação — para acompanhar a evolução.'],
  [
    'Corpo e saúde',
    'Nascimento, sexo, altura, peso, medidas e bioimpedância — para IMC, % de gordura e gasto calórico. São dados de saúde: só a sua conta acessa.',
  ],
  ['Alimentação', 'Refeições e alimentos salvos — para o balanço de calorias.'],
]

function ExclusaoConta({ onFechar }: { onFechar: () => void }) {
  const excluir = useExcluirConta()
  const [aberta, setAberta] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      await excluir.mutateAsync(senha)
      onFechar()
      toast.success('Sua conta e todos os seus dados foram excluídos.')
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível excluir a conta.')
    }
  }

  if (!aberta) {
    return (
      <Button variant="ghost" className="text-destructive hover:text-destructive w-fit" onClick={() => setAberta(true)}>
        <Trash2Icon />
        Excluir minha conta
      </Button>
    )
  }
  return (
    <form onSubmit={enviar} className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-3" noValidate>
      <p className="text-sm">
        <strong>Isto apaga a conta e todos os dados dela</strong> (financeiro, treinos, corpo, alimentação, lembretes) e não pode ser
        desfeito. Baixe seus dados antes, se quiser guardar.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="exclusao-senha" className="text-xs">
          Sua senha
        </Label>
        <Input id="exclusao-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="exclusao-confirmacao" className="text-xs">
          Digite EXCLUIR para confirmar
        </Label>
        <Input id="exclusao-confirmacao" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setAberta(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" disabled={!senha || confirmacao.trim() !== 'EXCLUIR' || excluir.isPending}>
          {excluir.isPending && <LoaderCircleIcon className="animate-spin" />}
          Excluir definitivamente
        </Button>
      </div>
    </form>
  )
}

/** LGPD: transparência sobre os dados, exportação e exclusão da conta. */
export function DialogPrivacidade({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [baixando, setBaixando] = useState(false)

  async function baixar() {
    setBaixando(true)
    try {
      const blob = await exportarMeusDados()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Arquivo com todos os seus dados baixado.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível exportar os dados.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="text-primary size-5" />
            Meus dados e privacidade
          </DialogTitle>
          <DialogDescription>
            O que o app guarda, para quê, e como baixar ou apagar tudo (LGPD). Nada é compartilhado com terceiros; a ExerciseDB só recebe o nome do
            exercício pesquisado, nunca seus dados.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 text-sm">
          {DADOS.map(([titulo, texto]) => (
            <div key={titulo}>
              <dt className="font-medium">{titulo}</dt>
              <dd className="text-muted-foreground text-xs leading-relaxed">{texto}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-2 border-t pt-4">
          <Button onClick={baixar} disabled={baixando} className="w-fit">
            {baixando ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
            Baixar meus dados (JSON)
          </Button>
          <p className="text-muted-foreground text-xs">Um arquivo com tudo o que está guardado na sua conta.</p>
        </div>

        <div className="grid gap-2 border-t pt-4">
          <ExclusaoConta onFechar={onFechar} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
