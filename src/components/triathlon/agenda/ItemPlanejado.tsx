import { useState } from 'react'
import { FileUpIcon, PencilIcon, WatchIcon } from 'lucide-react'

import { DialogConcluir } from '@/components/triathlon/agenda/DialogConcluir'
import { DialogExportarGarmin } from '@/components/triathlon/agenda/DialogExportarGarmin'
import { DialogExecucao } from '@/components/triathlon/forca/DialogExecucao'
import { DialogImportar } from '@/components/triathlon/importacao/DialogImportar'
import { IconeModalidade } from '@/components/triathlon/LinhaTreino'
import { Button } from '@/components/ui/button'
import { useMudarStatusTreino } from '@/hooks/useTriathlon'
import { distanciaTexto, ORDEM_STATUS, STATUS, statusEfetivo, type StatusEfetivo } from '@/lib/agenda'
import { duracaoCurta } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { StatusTreino, TreinoPlanejado } from '@/types/triathlon'

/** Ícone na cor da situação + nome (a cor nunca vai sozinha). */
export function SeloStatus({ efetivo, className }: { efetivo: StatusEfetivo; className?: string }) {
  const info = STATUS[efetivo.status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <info.icone className={cn('size-3.5', info.texto)} aria-hidden />
      {info.rotulo}
      {efetivo.automatico && <span className="text-muted-foreground">(sem marcar)</span>}
    </span>
  )
}

/** Três botões para trocar a situação com um toque: concluído, perdido, pendente. */
export function ControleStatus({
  status,
  onMudar,
  disabled,
}: {
  status: StatusTreino
  onMudar: (s: StatusTreino) => void
  disabled?: boolean
}) {
  return (
    <div className="flex shrink-0 gap-1" role="radiogroup" aria-label="Situação do treino">
      {ORDEM_STATUS.map((s) => {
        const info = STATUS[s]
        const ativo = s === status
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={info.rotulo}
            title={info.rotulo}
            disabled={disabled}
            onClick={() => onMudar(s)}
            className={cn(
              'flex size-8 items-center justify-center rounded-md border transition-colors disabled:opacity-50',
              ativo
                ? cn(info.fundo, 'border-transparent', s === 'pendente' ? 'text-black/75' : 'text-white')
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <info.icone className="size-4" />
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  treino: TreinoPlanejado
  onEditar: (t: TreinoPlanejado) => void
  /** mostra o dia (listas que misturam dias) */
  dia?: string
}

export function ItemPlanejado({ treino: t, onEditar, dia }: Props) {
  const mudar = useMudarStatusTreino()
  const [concluindo, setConcluindo] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const efetivo = statusEfetivo(t)
  // academia com exercícios: o registro é série por série
  const exercicios = t.modalidade === 'forca' ? (t.exercicios ?? []) : []
  // corrida, pedal e natação ainda sem atividade: dá para importar o arquivo do treino feito
  const podeImportar = t.modalidade !== 'forca' && !t.treino_id
  // corrida, pedal e natação por fazer: dá para levar o treino para o relógio Garmin
  // (no celular fica no diálogo de edição, para não apertar a linha)
  const podeExportar = t.modalidade !== 'forca' && t.status !== 'concluido'

  function mudarStatus(s: StatusTreino) {
    // concluído abre os campos do que foi feito (também para corrigir um já concluído)
    if (s === 'concluido') return exercicios.length ? setExecutando(true) : setConcluindo(true)
    if (s !== t.status) mudar.mutate({ id: t.id, status: s })
  }

  const planejado = [
    t.distancia_planejada_m ? distanciaTexto(t.modalidade, t.distancia_planejada_m) : null,
    t.duracao_planejada_seg ? duracaoCurta(t.duracao_planejada_seg) : null,
  ].filter(Boolean)
  const feito = [
    t.distancia_realizada_m !== null && t.modalidade !== 'forca' ? distanciaTexto(t.modalidade, t.distancia_realizada_m) : null,
    t.duracao_realizada_seg ? duracaoCurta(t.duracao_realizada_seg) : null,
  ].filter(Boolean)

  return (
    // No celular os botões descem para uma segunda linha (alinhados ao texto) e o nome ganha até 2 linhas:
    // lado a lado, os 4 botões espremiam o nome até sobrar só "Intervalado ...".
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5 sm:flex-nowrap">
      <IconeModalidade modalidade={t.modalidade} className="mt-0.5 size-8" />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEditar(t)}
          title={t.nome}
          className="line-clamp-2 block max-w-full text-left font-medium [overflow-wrap:anywhere] hover:underline sm:line-clamp-1"
        >
          {t.nome}
        </button>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          {dia && <span>{dia}</span>}
          <SeloStatus efetivo={efetivo} className="text-foreground" />
          {planejado.length > 0 && <span>plano: {planejado.join(' · ')}</span>}
          {t.status === 'concluido' && feito.length > 0 && <span className="text-foreground">feito: {feito.join(' · ')}</span>}
        </div>
        {t.descricao && <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{t.descricao}</p>}
        {exercicios.length > 0 && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {exercicios
              .slice(0, 4)
              .map((x) => x.nome)
              .join(' · ')}
            {exercicios.length > 4 && ` +${exercicios.length - 4}`}
          </p>
        )}
      </div>
      <div className="flex w-full shrink-0 items-center gap-1 pl-11 sm:w-auto sm:pl-0">
        {podeExportar && (
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden size-8 sm:inline-flex"
            aria-label={`Levar ${t.nome} para o relógio Garmin`}
            title="Levar para o relógio Garmin (.fit)"
            onClick={() => setExportando(true)}
          >
            <WatchIcon />
          </Button>
        )}
        {podeImportar && (
          <Button
            variant="outline"
            size="icon-sm"
            className="size-8"
            aria-label={`Importar o treino feito de ${t.nome}`}
            title="Importar o treino feito (arquivo ou AI Endurance)"
            onClick={() => setImportando(true)}
          >
            <FileUpIcon />
          </Button>
        )}
        <ControleStatus status={t.status} onMudar={mudarStatus} disabled={mudar.isPending} />
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hidden sm:inline-flex" aria-label={`Editar ${t.nome}`} onClick={() => onEditar(t)}>
          <PencilIcon />
        </Button>
      </div>
      <DialogConcluir
        treino={concluindo ? t : null}
        onFechar={() => setConcluindo(false)}
        onImportar={
          podeImportar
            ? () => {
                setConcluindo(false)
                setImportando(true)
              }
            : undefined
        }
      />
      <DialogExecucao treino={executando ? t : null} onFechar={() => setExecutando(false)} />
      {t.modalidade !== 'forca' && <DialogImportar aberto={importando} planejado={t} onFechar={() => setImportando(false)} />}
      <DialogExportarGarmin treino={exportando ? t : null} onFechar={() => setExportando(false)} />
    </li>
  )
}
