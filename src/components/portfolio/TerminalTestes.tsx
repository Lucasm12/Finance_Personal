import { useEffect, useState } from 'react'
import { CheckIcon, LoaderCircleIcon, RotateCcwIcon } from 'lucide-react'

import { FOCO, movimentoReduzido } from '@/components/portfolio/Comum'
import { cn } from '@/lib/utils'

const COMANDO = 'npx cypress run --spec competencias.cy.ts'

/** Competências apresentadas no formato de um relatório de testes (ilustração, não execução real). */
const COMPETENCIAS = [
  'Automação de testes E2E com Cypress',
  'Testes integrados ao pipeline de CI/CD',
  'Testes de API REST, SOAP e de contrato',
  'Validação de dados com SQL em Oracle',
  'Especificação de cenários BDD em Gherkin',
  'Docência em Teste e Qualidade de Software',
  'Pesquisa em Machine Learning (doutorado)',
]

// Animação em "passos" de 22 ms medidos pelo relógio (~2 s no total), com uma pausa inicial curta na
// primeira vez, enquanto o terminal surge. Pelo tempo decorrido (e não por setTimeout encadeado): se o
// navegador atrasar quadros, a digitação pula letras em vez de se arrastar.
const INTERVALO = 22
const ESPERA = 12
const FIM_COMANDO = COMANDO.length
const INICIO_ITENS = FIM_COMANDO + 5
const POR_ITEM = 5
const FIM = INICIO_ITENS + COMPETENCIAS.length * POR_ITEM + 2

/**
 * Terminal inspirado no Cypress: se digita sozinho uma vez ao abrir a página (e de novo no botão "rodar").
 * Com "reduzir movimento", já aparece completo. A legenda deixa claro que é uma ilustração das competências,
 * não o resultado de testes reais.
 */
export function TerminalTestes({ className }: { className?: string }) {
  const [reduzido] = useState(movimentoReduzido)
  const [rodada, setRodada] = useState(0)
  const [passo, setPasso] = useState(() => (reduzido ? FIM : -ESPERA))

  useEffect(() => {
    if (reduzido) return
    const espera = rodada === 0 ? ESPERA : 0
    const inicio = performance.now()
    let quadro = requestAnimationFrame(function tique(agora) {
      const p = Math.min(FIM, Math.floor((agora - inicio) / INTERVALO) - espera)
      setPasso(p)
      if (p < FIM) quadro = requestAnimationFrame(tique)
    })
    return () => cancelAnimationFrame(quadro)
  }, [rodada, reduzido])

  const letras = Math.min(Math.max(passo, 0), COMANDO.length)
  const digitando = passo < FIM_COMANDO
  const terminou = passo >= FIM

  return (
    <figure className={cn('relative', className)}>
      <div className="rounded-2xl bg-gradient-to-br from-emerald-400/40 via-white/10 to-white/[0.04] p-px shadow-2xl shadow-black/60">
        <div className="rounded-[15px] bg-[#080b0e]">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
            <span aria-hidden className="size-2.5 rounded-full bg-[#ff5f57]/80" />
            <span aria-hidden className="size-2.5 rounded-full bg-[#febc2e]/80" />
            <span aria-hidden className="size-2.5 rounded-full bg-[#28c840]/80" />
            <span className="pf-mono ml-2 min-w-0 flex-1 truncate text-xs text-white/65">competencias.cy.ts</span>
            {!reduzido && (
              <button
                type="button"
                onClick={() => {
                  setPasso(0)
                  setRodada((r) => r + 1)
                }}
                disabled={!terminou}
                aria-label="Animar o terminal de novo"
                className={cn(
                  'pf-mono flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50',
                  FOCO,
                )}
              >
                <RotateCcwIcon aria-hidden className="size-3" />
                rodar
              </button>
            )}
          </div>

          <div className="pf-mono px-4 py-5 text-[12.5px] leading-6 sm:px-5 sm:text-[13px]">
            <p className="break-all text-white/85">
              <span className="text-emerald-400">$</span> {COMANDO.slice(0, letras)}
              {digitando && (
                <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.2em] bg-emerald-400/80" />
              )}
            </p>

            <p className={cn('mt-3 text-white', passo < FIM_COMANDO + 2 && 'invisible')}>
              Lucas Marques <span className="text-white/60">· Software QA Engineer</span>
            </p>

            <ul className="mt-1">
              {COMPETENCIAS.map((competencia, i) => {
                const inicio = INICIO_ITENS + i * POR_ITEM
                const estado = passo < inicio ? 'aguardando' : passo < inicio + POR_ITEM - 2 ? 'rodando' : 'ok'
                return (
                  <li key={competencia} className={cn('flex items-start gap-2.5 pl-3', estado === 'aguardando' && 'invisible')}>
                    <span className="flex h-6 shrink-0 items-center">
                      {estado === 'rodando' ? (
                        <LoaderCircleIcon aria-hidden className="size-3 animate-spin text-white/60" />
                      ) : (
                        <CheckIcon aria-hidden className="size-3.5 text-emerald-400" strokeWidth={3} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-white/85">{competencia}</span>
                  </li>
                )
              })}
            </ul>

            <p className={cn('mt-3', !terminou && 'invisible')}>
              <span className="text-emerald-400">{COMPETENCIAS.length} competências</span>
              <span className="text-white/60"> · ilustração</span>
            </p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-pretty text-white/60">
        Ilustração no formato de um relatório do Cypress: apresenta competências, não resultados de testes reais.
      </figcaption>
    </figure>
  )
}
