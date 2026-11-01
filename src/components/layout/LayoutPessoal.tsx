import { BookOpenIcon, ListTodoIcon, NotebookPenIcon, RepeatIcon, SunIcon, TargetIcon } from 'lucide-react'

import { LayoutModulo, type LinkModulo } from '@/components/layout/LayoutModulo'
import { useInicializarPessoal } from '@/hooks/usePessoal'
import { MODULO_PESSOAL, ROTAS_PESSOAL } from '@/modulos'

const LINKS: LinkModulo[] = [
  { para: ROTAS_PESSOAL.dia, rotulo: 'Meu dia', icone: SunIcon, exato: true },
  { para: ROTAS_PESSOAL.biblia, rotulo: 'Bíblia', icone: BookOpenIcon },
  { para: ROTAS_PESSOAL.metas, rotulo: 'Metas', icone: TargetIcon },
  { para: ROTAS_PESSOAL.habitos, rotulo: 'Hábitos', icone: RepeatIcon },
  { para: ROTAS_PESSOAL.tarefas, rotulo: 'Tarefas', icone: ListTodoIcon },
  { para: ROTAS_PESSOAL.diario, rotulo: 'Diário', icone: NotebookPenIcon },
]

export function LayoutPessoal() {
  // áreas padrão e a meta "Ler a Bíblia inteira no ano" (o banco só cria o que falta)
  useInicializarPessoal()
  return <LayoutModulo modulo={MODULO_PESSOAL} links={LINKS} />
}
