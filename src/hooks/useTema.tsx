import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { corNoTema } from '@/lib/cores'

export type Tema = 'claro' | 'escuro' | 'sistema'

interface TemaContexto {
  tema: Tema
  escuro: boolean
  setTema: (tema: Tema) => void
  /** Ajusta a cor de uma categoria para o tema atual. */
  cor: (cor: string) => string
}

const Contexto = createContext<TemaContexto | null>(null)
const CHAVE = 'tema'

function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo
  } catch {
    // armazenamento indisponível (aba anônima, etc.)
  }
  return 'sistema'
}

const consultaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)')

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(lerTema)
  const [sistemaEscuro, setSistemaEscuro] = useState(() => consultaEscuro().matches)

  useEffect(() => {
    const mq = consultaEscuro()
    const aoMudar = () => setSistemaEscuro(mq.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])

  const escuro = tema === 'escuro' || (tema === 'sistema' && sistemaEscuro)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro)
  }, [escuro])

  const setTema = useCallback((novo: Tema) => {
    setTemaState(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // ignora
    }
  }, [])

  const valor = useMemo<TemaContexto>(
    () => ({ tema, escuro, setTema, cor: (c: string) => corNoTema(c, escuro) }),
    [tema, escuro, setTema],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTema() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useTema precisa estar dentro de <TemaProvider>')
  return ctx
}
