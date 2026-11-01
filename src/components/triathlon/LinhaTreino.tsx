import { HeartIcon, ZapIcon } from 'lucide-react'

import { useTema } from '@/hooks/useTema'
import { cargaTreino, duracaoCurta, formatarDistancia, MODALIDADES, ritmoTreino } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade, PerfilAtleta, Treino } from '@/types/triathlon'

export function IconeModalidade({ modalidade, className }: { modalidade: Modalidade; className?: string }) {
  const { cor } = useTema()
  const info = MODALIDADES[modalidade]
  const Icone = info.icone
  return (
    <span
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-white', className)}
      style={{ backgroundColor: cor(info.cor) }}
      title={info.nome}
    >
      <Icone className="size-[55%]" />
    </span>
  )
}

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
/** "sáb., 31 de out., 06:00" → "Sáb., 31 de out., 06:00" (só a primeira letra) */
const dataHora = (iso: string) => {
  const texto = formatoDataHora.format(new Date(iso))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

interface Props {
  treino: Treino
  perfil: PerfilAtleta | null | undefined
  onAbrir: (t: Treino) => void
  compacto?: boolean
}

export function LinhaTreino({ treino: t, perfil, onAbrir, compacto }: Props) {
  const ritmo = ritmoTreino(t)
  const carga = cargaTreino(t, perfil)
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(t)}
        className="hover:bg-accent/50 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
      >
        <IconeModalidade modalidade={t.modalidade} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{t.nome}</span>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
            <span>{dataHora(t.data_hora)}</span>
            {!compacto && t.fc_media && (
              <span className="flex items-center gap-0.5">
                <HeartIcon className="size-3" />
                {t.fc_media} bpm
              </span>
            )}
            {!compacto && (
              <span className="flex items-center gap-0.5" title={`Carga calculada por ${carga.metodo}`}>
                <ZapIcon className="size-3" />
                carga {carga.valor}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm tabular-nums">
          <div className="font-medium">{formatarDistancia(t.distancia_m, t.modalidade)}</div>
          <div className="text-muted-foreground text-xs">
            {duracaoCurta(t.duracao_seg)}
            {ritmo && ` · ${ritmo.texto} ${ritmo.unidade}`}
          </div>
        </div>
      </button>
    </li>
  )
}
