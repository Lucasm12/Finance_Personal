import type { Situacao } from '@/lib/format'
import type { LancamentoComConta } from '@/types'

export type LancamentoVisivel = LancamentoComConta & { situacao: Situacao }
