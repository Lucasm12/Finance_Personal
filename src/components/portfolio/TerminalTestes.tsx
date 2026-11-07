import { useEffect, useState, type PointerEvent } from 'react'
import { CheckIcon, LoaderCircleIcon, RotateCcwIcon } from 'lucide-react'

import { movimentoReduzido } from '@/components/portfolio/Comum'
import { cn } from '@/lib/utils'

const COMANDO = 'npx cypress run --spec carreira.cy.ts'

const TESTES = [
  { nome: 'Automação de testes E2E com Cypress', ms: 312 },
  { nome: 'Testes integrados ao pipeline de CI/CD', ms: 187 },
  { nome: 'Testes de API REST, SOAP e de contrato', ms: 241 },
  { nome: 'Validação de dados com SQL em Oracle', ms: 158 },
  { nome: 'Especificação de cenários BDD em Gherkin', ms: 126 },
  { nome: 'Docência em Teste e Qualidade de Software', ms: 94 },
  { nome: 'Pesquisa em Machine Learning (doutorado)', ms: 203 },
]

// Linha do tempo da animação, em "passos" de 40 ms.
const INTERVALO = 40
const ESPERA = 18
const FIM_COMANDO = ESPERA + COMANDO.length
const INICIO_TESTES = FIM_COMANDO + 8
const POR_TESTE = 8
const FIM = INICIO_TESTES + TESTES.length * POR_TESTE + 4
const DURACAO_TOTAL = TESTES.reduce((soma, t) => soma + t.ms, 0)

function Cursor() {
  return <span aria-hidden className="pf-cursor ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.2em] bg-emerald-400/80" />
}

/** Inclina o cartão levemente na direção do mouse (só com mouse, e nunca com "reduzir movimento"). */
function inclinar(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== 'mouse') return
  const caixa = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - caixa.left) / caixa.width - 0.5
  const y = (e.clientY - caixa.top) / caixa.height - 0.5
  e.currentTarget.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`)
  e.currentTarget.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`)
}

function endireitar(e: PointerEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty('--rx', '0deg')
  e.currentTarget.style.setProperty('--ry', '0deg')
}

/** Terminal que "roda" uma suíte de testes sobre a carreira: o cartão de visitas de um QA. */
export function TerminalTestes({ className }: { className?: string }) {
  const [reduzido] = useState(movimentoReduzido)
  const [passo, setPasso] = useState(() => (reduzido ? FIM : 0))

  useEffect(() => {
    if (reduzido || passo >= FIM) return
    const id = setTimeout(() => setPasso((p) => p + 1), INTERVALO)
    return () => clearTimeout(id)
  }, [passo, reduzido])

  const letras = Math.min(Math.max(passo - ESPERA, 0), COMANDO.length)
  const digitando = passo < FIM_COMANDO
  const cabecalho = passo >= FIM_COMANDO + 4
  const terminou = passo >= FIM

  return (
    <div onPointerMove={inclinar} onPointerLeave={endireitar} className={cn('pf-inclinar relative', className)}>
      <div aria-hidden className="absolute -inset-8 rounded-[2.5rem] bg-emerald-500/[0.07] blur-3xl" />
      <figure className="relative rounded-2xl bg-gradient-to-br from-emerald-400/45 via-white/10 to-white/[0.04] p-px shadow-2xl shadow-black/70">
        <div className="rounded-[15px] bg-[#080b0e]/95">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <span aria-hidden className="size-2.5 rounded-full bg-[#ff5f57]/80" />
            <span aria-hidden className="size-2.5 rounded-full bg-[#febc2e]/80" />
            <span aria-hidden className="size-2.5 rounded-full bg-[#28c840]/80" />
            <figcaption className="pf-mono ml-2 min-w-0 flex-1 truncate text-xs text-white/50">
              carreira.cy.ts · cypress run
            </figcaption>
            {!reduzido && (
              <button
                type="button"
                onClick={() => setPasso(0)}
                disabled={!terminou}
                className={cn(
                  'pf-mono flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none',
                  !terminou && 'invisible',
                )}
                aria-label="Rodar os testes de novo"
              >
                <RotateCcwIcon className="size-3" />
                rodar
              </button>
            )}
          </div>

          <div className="pf-mono px-4 py-5 text-[12px] leading-6 sm:px-5 sm:text-[13px]">
            <p className="break-all text-white/85">
              <span className="text-emerald-400">$</span> {COMANDO.slice(0, letras)}
              {digitando && <Cursor />}
            </p>

            <p className={cn('mt-3 text-white transition-opacity duration-300', !cabecalho && 'opacity-0')}>
              Lucas Marques <span className="text-white/45">· Software QA Engineer</span>
            </p>

            <ul className="mt-1">
              {TESTES.map((teste, i) => {
                const inicio = INICIO_TESTES + i * POR_TESTE
                const estado = passo < inicio ? 'aguardando' : passo < inicio + POR_TESTE - 3 ? 'rodando' : 'ok'
                return (
                  <li
                    key={teste.nome}
                    className={cn(
                      'flex items-start gap-2.5 pl-3 transition-opacity duration-200',
                      estado === 'aguardando' && 'opacity-0',
                    )}
                  >
                    <span className="flex h-6 shrink-0 items-center">
                      {estado === 'rodando' ? (
                        <LoaderCircleIcon aria-hidden className="size-3 animate-spin text-white/45" />
                      ) : (
                        <CheckIcon aria-label="passou" className="size-3.5 text-emerald-400" strokeWidth={3} />
                      )}
                    </span>
                    <span className={cn('min-w-0 flex-1', estado === 'ok' ? 'text-white/75' : 'text-white/40')}>
                      {teste.nome}
                    </span>
                    <span className="hidden shrink-0 text-white/30 tabular-nums sm:inline">
                      {estado === 'ok' ? `${teste.ms}ms` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>

            <p className={cn('mt-3 transition-opacity duration-300', !terminou && 'opacity-0')}>
              <span className="text-emerald-400">{TESTES.length} passing</span>{' '}
              <span className="text-white/40">({(DURACAO_TOTAL / 1000).toFixed(1)}s)</span>
              <span className="ml-2 text-white/30">· 0 failing</span>
              {terminou && <Cursor />}
            </p>
          </div>
        </div>
      </figure>
    </div>
  )
}
