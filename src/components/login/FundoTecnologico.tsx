import { useRef, type PointerEvent, type ReactNode } from 'react'

import { FundoAnimado } from '@/components/login/FundoAnimado'
import './login.css'

/** Atualiza a posição da luz que acompanha o cursor dentro de um cartão (.login-cartao-luz). */
export function moverLuzCartao(e: PointerEvent<HTMLElement>) {
  const caixa = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - caixa.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - caixa.top}px`)
}

/** Tela escura com grade, rede de pontos animada e brilho que segue o cursor (login e escolha de módulo). */
export function FundoTecnologico({ children }: { children: ReactNode }) {
  const brilhoRef = useRef<HTMLDivElement>(null)

  function moverBrilho(e: PointerEvent<HTMLDivElement>) {
    brilhoRef.current?.style.setProperty('--x', `${e.clientX}px`)
    brilhoRef.current?.style.setProperty('--y', `${e.clientY}px`)
  }

  return (
    <div
      onPointerMove={moverBrilho}
      className="dark relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#06080a] px-4 py-10 text-white"
    >
      <div aria-hidden className="login-grade absolute inset-0" />
      <FundoAnimado />
      <div ref={brilhoRef} aria-hidden className="login-brilho pointer-events-none absolute inset-0" />
      {children}
    </div>
  )
}
