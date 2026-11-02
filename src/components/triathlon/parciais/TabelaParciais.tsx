import { useMemo, useState } from 'react'
import { GaugeIcon, RabbitIcon, TurtleIcon } from 'lucide-react'

import { Dado } from '@/components/triathlon/corpo/Blocos'
import { Skeleton } from '@/components/ui/skeleton'
import { destaques, ritmoParcial, rotuloTipo, tiposPresentes } from '@/lib/parciais/calculo'
import { distanciaTexto } from '@/lib/sugestoes/estrutura'
import { duracaoRelogio, formatarDistancia } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade, Parcial, TipoParcial } from '@/types/triathlon'

interface Coluna {
  rotulo: string
  valor: (p: Parcial) => string | null
  alinhar?: 'left'
}

const um = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const dist = (m: number | null, modalidade: Modalidade) =>
  m === null ? null : modalidade === 'natacao' || modalidade === 'forca' ? `${Math.round(m)} m` : m < 1000 ? `${Math.round(m)} m` : formatarDistancia(m, modalidade)

function colunas(modalidade: Modalidade, tipo: TipoParcial): Coluna[] {
  const ritmo = (p: Parcial) => {
    const r = ritmoParcial(modalidade, p)
    return r ? `${r.texto} ${r.unidade}` : null
  }
  const lista: Coluna[] = [
    { rotulo: 'Distância', valor: (p) => dist(p.distancia_m, modalidade) },
    { rotulo: 'Tempo', valor: (p) => duracaoRelogio(p.duracao_seg) },
    { rotulo: modalidade === 'ciclismo' ? 'Velocidade' : modalidade === 'natacao' ? 'Pace /100 m' : 'Pace', valor: ritmo },
    { rotulo: 'FC média', valor: (p) => (p.fc_media ? `${p.fc_media}${p.fc_max ? ` / ${p.fc_max}` : ''}` : null) },
    { rotulo: 'Potência', valor: (p) => (p.potencia_media !== null ? `${p.potencia_media} W` : null) },
    { rotulo: modalidade === 'natacao' ? 'Braçadas/min' : 'Cadência', valor: (p) => (p.cadencia_media ? um.format(p.cadencia_media) : null) },
    {
      rotulo: 'Elevação',
      valor: (p) =>
        p.elevacao_ganho_m === null && p.elevacao_perda_m === null ? null : `+${Math.round(p.elevacao_ganho_m ?? 0)} / −${Math.round(p.elevacao_perda_m ?? 0)} m`,
    },
    { rotulo: 'Braçadas', valor: (p) => (p.bracadas !== null ? String(p.bracadas) : null) },
    { rotulo: 'Estilo', valor: (p) => p.estilo, alinhar: 'left' },
  ]
  // a distância de cada km é sempre 1 km (só a última muda): fica no rótulo da linha
  return tipo === 'km' ? lista.filter((c) => c.rotulo !== 'Distância') : lista
}

/** "km 5", "volta 3", "série 2", "piscina 14", "trecho 4" */
function nomeParcial(p: Parcial, modalidade: Modalidade): string {
  if (p.tipo === 'km') return `km ${p.ordem}`
  if (p.tipo === 'piscina') return `piscina ${p.ordem}`
  if (p.tipo === 'intervalo') return `trecho ${p.ordem}`
  return `${modalidade === 'natacao' ? 'série' : 'volta'} ${p.ordem}`
}

function rotuloLinha(p: Parcial, modalidade: Modalidade, acumulado: number): string {
  if (p.tipo === 'km') return p.distancia_m !== null && p.distancia_m < 990 ? `${um.format(acumulado / 1000)} km` : `km ${p.ordem}`
  if (p.tipo === 'intervalo') return distanciaTexto(acumulado, modalidade === 'natacao' ? 'natacao' : 'corrida')
  if (p.tipo === 'piscina') return String(p.ordem)
  return `${modalidade === 'natacao' ? 'Série' : 'Volta'} ${p.ordem}`
}

interface Props {
  modalidade: Modalidade
  parciais: Parcial[] | undefined
  carregando?: boolean
}

/** Parciais do treino em tabela, com a mais rápida, a mais lenta e a média geral. */
export function TabelaParciais({ modalidade, parciais = [], carregando }: Props) {
  const tipos = useMemo(() => tiposPresentes(modalidade, parciais), [modalidade, parciais])
  const [escolhido, setEscolhido] = useState<TipoParcial | null>(null)
  const tipo = escolhido && tipos.includes(escolhido) ? escolhido : tipos[0]
  const lista = useMemo(() => parciais.filter((p) => p.tipo === tipo).sort((a, b) => a.ordem - b.ordem), [parciais, tipo])
  const d = useMemo(() => destaques(lista, modalidade), [lista, modalidade])

  if (carregando) return <Skeleton className="h-48 rounded-lg" />
  if (!tipos.length) {
    return (
      <div className="text-muted-foreground grid gap-1 rounded-lg border border-dashed px-4 py-6 text-center text-sm">
        <p className="text-foreground font-medium">Este treino não tem parciais</p>
        <p>
          As parciais vêm de arquivos .fit, .tcx ou .gpx (ou da AI Endurance) com GPS, distância ou voltas. Treinos registrados à mão e o .csv do
          TrainingPeaks não trazem parciais. Se você tem o arquivo deste treino, importe-o e escolha “completar o treino existente”.
        </p>
      </div>
    )
  }

  const cols = colunas(modalidade, tipo).filter((c) => lista.some((p) => c.valor(p) !== null))
  const ritmo = (p: Parcial | null) => {
    const r = p && ritmoParcial(modalidade, p)
    return r ? `${r.texto} ${r.unidade}` : '—'
  }
  let acumulado = 0

  return (
    <div className="grid gap-3">
      {tipos.length > 1 && (
        <div className="bg-muted flex w-fit gap-1 rounded-lg p-1" role="radiogroup" aria-label="Tipo de parcial">
          {tipos.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === tipo}
              onClick={() => setEscolhido(t)}
              className={cn('rounded-md px-3 py-1 text-xs font-medium', t === tipo ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {rotuloTipo(modalidade, t)}
            </button>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Dado
          rotulo="Mais rápida"
          valor={d.rapida ? ritmo(d.rapida) : '—'}
          detalhe={d.rapida ? `${nomeParcial(d.rapida, modalidade)} · ${duracaoRelogio(d.rapida.duracao_seg)}` : 'precisa de 2 parciais completas'}
        />
        <Dado
          rotulo="Mais lenta"
          valor={d.lenta ? ritmo(d.lenta) : '—'}
          detalhe={d.lenta ? `${nomeParcial(d.lenta, modalidade)} · ${duracaoRelogio(d.lenta.duracao_seg)}` : 'precisa de 2 parciais completas'}
        />
        <Dado
          rotulo="Média geral"
          valor={d.media.ritmo ? `${d.media.ritmo.texto} ${d.media.ritmo.unidade}` : duracaoRelogio(d.media.duracao_seg)}
          detalhe={[d.media.fc_media ? `FC ${d.media.fc_media}` : null, d.media.potencia_media !== null ? `${d.media.potencia_media} W` : null, `${lista.length} parciais`]
            .filter(Boolean)
            .join(' · ')}
        />
      </dl>

      <div className="max-h-[50dvh] overflow-auto rounded-lg border">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-muted/60 sticky top-0">
            <tr className="text-muted-foreground text-right text-xs">
              <th className="px-3 py-2 text-left font-medium">{tipo === 'km' ? 'Km' : tipo === 'piscina' ? 'Piscina' : '#'}</th>
              {cols.map((c) => (
                <th key={c.rotulo} className={cn('px-3 py-2 font-medium whitespace-nowrap', c.alinhar === 'left' && 'text-left')}>
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {lista.map((p) => {
              acumulado += p.distancia_m ?? 0
              const rapida = d.rapida?.ordem === p.ordem
              const lenta = d.lenta?.ordem === p.ordem
              return (
                <tr key={p.ordem} className={cn('text-right', rapida && 'bg-status-bom/10', lenta && 'bg-status-alerta/10', p.descanso && 'text-muted-foreground')}>
                  <td className="px-3 py-1.5 text-left whitespace-nowrap">
                    <span className="font-medium">{rotuloLinha(p, modalidade, acumulado)}</span>
                    {rapida && (
                      <span className="text-status-bom ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium">
                        <RabbitIcon className="size-3" aria-hidden />
                        mais rápida
                      </span>
                    )}
                    {lenta && (
                      <span className="text-status-alerta ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium">
                        <TurtleIcon className="size-3" aria-hidden />
                        mais lenta
                      </span>
                    )}
                    {p.descanso && <span className="ml-1.5 text-[11px]">descanso</span>}
                  </td>
                  {cols.map((c) => (
                    <td key={c.rotulo} className={cn('px-3 py-1.5 whitespace-nowrap', c.alinhar === 'left' && 'text-left')}>
                      {c.valor(p) ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-muted/40 border-t">
            <tr className="text-right font-medium">
              <td className="px-3 py-2 text-left">
                <span className="inline-flex items-center gap-1">
                  <GaugeIcon className="size-3.5" aria-hidden />
                  Total
                </span>
              </td>
              {cols.map((c) => (
                <td key={c.rotulo} className="px-3 py-2 whitespace-nowrap">
                  {c.rotulo === 'Distância'
                    ? (dist(d.media.distancia_m, modalidade) ?? '—')
                    : c.rotulo === 'Tempo'
                      ? duracaoRelogio(d.media.duracao_seg)
                      : c.rotulo.startsWith('Pace') || c.rotulo === 'Velocidade'
                        ? d.media.ritmo
                          ? `${d.media.ritmo.texto} ${d.media.ritmo.unidade}`
                          : '—'
                        : c.rotulo === 'FC média'
                          ? (d.media.fc_media ?? '—')
                          : c.rotulo === 'Potência'
                            ? d.media.potencia_media !== null
                              ? `${d.media.potencia_media} W`
                              : '—'
                            : ''}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
