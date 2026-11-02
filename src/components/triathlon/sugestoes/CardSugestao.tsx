import type { ReactNode } from 'react'
import { BookmarkCheckIcon, BookmarkPlusIcon, CalendarPlusIcon, ClockIcon, LightbulbIcon, RulerIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import { IconeModalidade } from '@/components/triathlon/LinhaTreino'
import { VisaoEstrutura } from '@/components/triathlon/sugestoes/VisaoEstrutura'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OBJETIVOS_ENDURANCE } from '@/lib/sugestoes/catalogo'
import { distanciaTexto } from '@/lib/sugestoes/estrutura'
import { NOMES_NIVEL } from '@/lib/forca/exercicios'
import { duracaoCurta } from '@/lib/triathlon'
import type { BlocoTreino, EstruturaTreino, PerfilAtleta } from '@/types/triathlon'

interface Props {
  nome: string
  estrutura: EstruturaTreino
  duracao_seg: number | null
  distancia_m: number | null
  estimado?: boolean
  perfil: PerfilAtleta | null | undefined
  proposito?: string | null
  dica?: string | null
  /** etiquetas extras (Recomendada, data do plano…) */
  destaque?: ReactNode
  salvo?: boolean
  salvando?: boolean
  onSalvar?: () => void
  onAgendar?: () => void
  onExcluir?: () => void
  /** ajustar repetições da parte principal */
  onChange?: (blocos: BlocoTreino[]) => void
}

/** Um treino sugerido (catálogo, AI Endurance ou salvo) com a estrutura e as ações. */
export function CardSugestao({ nome, estrutura, duracao_seg, distancia_m, estimado, perfil, proposito, dica, destaque, salvo, salvando, onSalvar, onAgendar, onExcluir, onChange }: Props) {
  const aprox = estimado ? '≈ ' : ''
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <IconeModalidade modalidade={estrutura.modalidade} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold">{nome}</h3>
            {destaque}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline">{OBJETIVOS_ENDURANCE[estrutura.objetivo]}</Badge>
            <Badge variant="outline">{NOMES_NIVEL[estrutura.nivel]}</Badge>
            {duracao_seg ? (
              <Badge variant="outline">
                <ClockIcon />
                {aprox}
                {duracaoCurta(duracao_seg)}
              </Badge>
            ) : null}
            {distancia_m ? (
              <Badge variant="outline">
                <RulerIcon />
                {aprox}
                {distanciaTexto(distancia_m, estrutura.modalidade)}
              </Badge>
            ) : null}
            {estrutura.fonte === 'ai_endurance' && (
              <Badge variant="secondary">
                <SparklesIcon />
                AI Endurance
              </Badge>
            )}
          </div>
        </div>
      </div>
      {proposito && <p className="text-muted-foreground text-sm">{proposito}</p>}
      <VisaoEstrutura estrutura={estrutura} perfil={perfil} onChange={onChange} />
      {dica && (
        <p className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
          <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
          {dica}
        </p>
      )}
      {(onSalvar || onAgendar || onExcluir) && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {onAgendar && (
            <Button size="sm" onClick={onAgendar}>
              <CalendarPlusIcon />
              Colocar na agenda
            </Button>
          )}
          {onSalvar && (
            <Button size="sm" variant="outline" onClick={onSalvar} disabled={salvo || salvando}>
              {salvo ? <BookmarkCheckIcon /> : <BookmarkPlusIcon />}
              {salvo ? 'Salvo' : 'Salvar'}
            </Button>
          )}
          {onExcluir && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onExcluir}>
              <Trash2Icon />
              Excluir
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
