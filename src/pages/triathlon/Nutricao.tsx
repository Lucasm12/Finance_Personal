import { Link } from 'react-router-dom'

import { AbaAlimentacao } from '@/components/triathlon/AbaAlimentacao'
import { ROTAS_TRIATHLON } from '@/modulos'

export default function NutricaoTriathlon() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nutrição</h1>
        <p className="text-muted-foreground text-sm">
          Alimentação e o equilíbrio com o que você gasta nos treinos. Peso e medidas ficam em{' '}
          <Link to={ROTAS_TRIATHLON.corpo} className="text-primary underline">
            Corpo
          </Link>
          .
        </p>
      </div>
      <AbaAlimentacao />
    </div>
  )
}
