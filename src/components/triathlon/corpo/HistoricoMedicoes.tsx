import { useState } from 'react'
import { PencilIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { dataCurta, formatarValor, imcDe } from '@/lib/corpo'
import { formatarDecimal } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Pesagem } from '@/types/triathlon'

type CampoOpcional = Exclude<keyof Pesagem, 'id' | 'data' | 'peso_kg' | 'observacao'>

const COLUNAS: { campo: CampoOpcional; rotulo: string; sufixo: string }[] = [
  { campo: 'gordura_pct', rotulo: 'Gordura', sufixo: '%' },
  { campo: 'massa_muscular_kg', rotulo: 'Músculo', sufixo: ' kg' },
  { campo: 'agua_pct', rotulo: 'Água', sufixo: '%' },
  { campo: 'gordura_visceral', rotulo: 'Visceral', sufixo: '' },
  { campo: 'massa_ossea_kg', rotulo: 'Osso', sufixo: ' kg' },
  { campo: 'cintura_cm', rotulo: 'Cintura', sufixo: '' },
  { campo: 'quadril_cm', rotulo: 'Quadril', sufixo: '' },
  { campo: 'pescoco_cm', rotulo: 'Pescoço', sufixo: '' },
  { campo: 'braco_cm', rotulo: 'Braço', sufixo: '' },
  { campo: 'coxa_cm', rotulo: 'Coxa', sufixo: '' },
]

const POR_PAGINA = 15
const um = (n: number) => formatarValor(n, { casas: 1 })

interface Props {
  pesagens: Pesagem[]
  alturaCm: number | null
  onEditar: (p: Pesagem) => void
}

export function HistoricoMedicoes({ pesagens, alturaCm, onEditar }: Props) {
  const [todas, setTodas] = useState(false)
  // só as colunas que têm algum valor registrado
  const colunas = COLUNAS.filter((c) => pesagens.some((p) => p[c.campo] !== null))
  const lista = [...pesagens].reverse()
  const visiveis = todas ? lista : lista.slice(0, POR_PAGINA)

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-semibold">Histórico de medições</h2>
        <span className="text-muted-foreground text-xs">{pesagens.length} registro(s) · toque numa linha para editar</span>
      </div>
      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground bg-muted/40 text-right text-xs">
              <th className="px-4 py-2 text-left font-medium">Data</th>
              <th className="px-2 py-2 font-medium">Peso</th>
              <th className="px-2 py-2 font-medium">Variação</th>
              {alturaCm && <th className="px-2 py-2 font-medium">IMC</th>}
              {colunas.map((c) => (
                <th key={c.campo} className="px-2 py-2 font-medium whitespace-nowrap">
                  {c.rotulo}
                  {c.campo.endsWith('_cm') && <span className="font-normal"> (cm)</span>}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {visiveis.map((p, i) => {
              const anterior = lista[i + 1]
              const diferenca = anterior ? p.peso_kg - anterior.peso_kg : null
              return (
                <tr
                  key={p.id}
                  className="hover:bg-accent/50 cursor-pointer text-right"
                  onClick={() => onEditar(p)}
                  title={p.observacao ?? undefined}
                >
                  <td className="px-4 py-2 text-left whitespace-nowrap">
                    {dataCurta(p.data)}
                    {p.observacao && <span className="text-muted-foreground ml-1 text-xs">•</span>}
                  </td>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">{um(p.peso_kg)} kg</td>
                  <td
                    className={cn(
                      'px-2 py-2 whitespace-nowrap',
                      diferenca === null || Math.abs(diferenca) < 0.05 ? 'text-muted-foreground' : '',
                    )}
                  >
                    {diferenca === null ? '—' : `${diferenca >= 0.05 ? '+' : diferenca <= -0.05 ? '−' : ''}${um(Math.abs(diferenca))}`}
                  </td>
                  {alturaCm && <td className="px-2 py-2">{um(imcDe(p.peso_kg, alturaCm))}</td>}
                  {colunas.map((c) => (
                    <td key={c.campo} className="px-2 py-2 whitespace-nowrap">
                      {p[c.campo] === null ? <span className="text-muted-foreground">—</span> : `${formatarDecimal(p[c.campo]!)}${c.sufixo}`}
                    </td>
                  ))}
                  <td className="pr-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label={`Editar medição de ${dataCurta(p.data)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditar(p)
                      }}
                    >
                      <PencilIcon />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {lista.length > POR_PAGINA && (
        <div className="border-t px-4 py-2 text-center">
          <Button variant="ghost" size="sm" onClick={() => setTodas(!todas)}>
            {todas ? 'Mostrar menos' : `Mostrar todas (${lista.length})`}
          </Button>
        </div>
      )}
    </Card>
  )
}
