import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LockIcon,
  MailIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import { FundoTecnologico, moverLuzCartao } from '@/components/login/FundoTecnologico'
import { LogoAnimado } from '@/components/login/LogoAnimado'
import { useAuth } from '@/hooks/useAuth'
import { mensagemErro } from '@/lib/erros'
import { supabase } from '@/lib/supabase'
import { saudacao } from '@/lib/texto'
import { cn } from '@/lib/utils'
import { ROTA_INICIO, ROTA_MODULOS } from '@/modulos'

type Estado = 'ocioso' | 'entrando' | 'sucesso'

/** Relógio e situação real da conexão do aparelho. */
function useStatus() {
  const [agora, setAgora] = useState(() => new Date())
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 1000)
    const ficouOnline = () => setOnline(true)
    const ficouOffline = () => setOnline(false)
    window.addEventListener('online', ficouOnline)
    window.addEventListener('offline', ficouOffline)
    return () => {
      clearInterval(relogio)
      window.removeEventListener('online', ficouOnline)
      window.removeEventListener('offline', ficouOffline)
    }
  }, [])

  return { agora, online }
}

interface CampoProps extends React.ComponentProps<'input'> {
  id: string
  rotulo: string
  icone: typeof MailIcon
  acessorio?: ReactNode
}

/** Campo com ícone e rótulo que flutua ao focar ou preencher. */
function Campo({ id, rotulo, icone: Icone, acessorio, className, ...props }: CampoProps) {
  return (
    <div className="group relative">
      <Icone
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-emerald-400"
      />
      <input
        id={id}
        placeholder=" "
        className={cn(
          'login-campo peer h-13 w-full rounded-xl border border-white/10 bg-white/[0.03] pt-4 pr-3 pl-10 text-[15px] text-white transition outline-none',
          'hover:border-white/20 focus:border-emerald-400/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-emerald-400/10',
          'aria-invalid:border-red-400/60 aria-invalid:focus:ring-red-400/10',
          className,
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute top-1/2 left-10 -translate-y-1/2 text-sm text-white/45 transition-all duration-200',
          'peer-focus:top-3.5 peer-focus:text-[11px] peer-focus:text-emerald-300',
          'peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[11px]',
          'peer-autofill:top-3.5 peer-autofill:text-[11px]',
        )}
      >
        {rotulo}
      </label>
      {acessorio}
    </div>
  )
}

export default function Login() {
  const { sessao, carregando } = useAuth()
  const navigate = useNavigate()
  const { agora, online } = useStatus()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [estado, setEstado] = useState<Estado>('ocioso')
  const [erro, setErro] = useState<string | null>(null)
  const [tremendo, setTremendo] = useState(false)

  const [falhas, setFalhas] = useState(0)
  const senhaRef = useRef<HTMLInputElement>(null)

  // Depois de uma senha recusada (e do campo voltar a ficar habilitado), seleciona a senha para redigitar.
  useEffect(() => {
    if (falhas === 0) return
    senhaRef.current?.focus()
    senhaRef.current?.select()
  }, [falhas])

  // Já logado ao abrir a página: vai para a escolha do módulo. Durante o login, espera a animação de sucesso.
  if (!carregando && sessao && estado === 'ocioso') return <Navigate to={ROTA_MODULOS} replace />

  function falhar(mensagem: string) {
    setEstado('ocioso')
    setErro(mensagem)
    setTremendo(true)
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (estado !== 'ocioso') return
    // Lê do formulário: o autopreenchimento do navegador nem sempre chega ao estado do React.
    const dados = new FormData(e.currentTarget)
    const emailInformado = String(dados.get('email') ?? email).trim()
    const senhaInformada = String(dados.get('senha') ?? senha)
    if (!emailInformado || !senhaInformada) return falhar('Informe e-mail e senha.')

    setErro(null)
    setEstado('entrando')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailInformado, password: senhaInformada })
      if (error) throw error
      setEstado('sucesso')
      // ROTA_MODULOS é a escolha do módulo (Financeiro, Triathlon...); "/" é o portfólio público
      setTimeout(() => navigate(ROTA_MODULOS, { replace: true }), 900)
    } catch (problema) {
      falhar(mensagemErro(problema))
      setFalhas((n) => n + 1)
    }
  }

  function verificarCapsLock(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState('CapsLock'))
  }

  const ocupado = estado !== 'ocioso'

  return (
    <FundoTecnologico>
      <Link
        to={ROTA_INICIO}
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white/50 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none sm:top-6 sm:left-6"
      >
        <ArrowLeftIcon className="size-3.5" />
        portfólio
      </Link>
      <main className="animate-in fade-in slide-in-from-bottom-4 relative z-10 w-full max-w-sm duration-700">
        <div
          onPointerMove={moverLuzCartao}
          onAnimationEnd={() => setTremendo(false)}
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/70 p-7 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8',
            tremendo && 'login-tremer',
          )}
        >
          {/* luz que acompanha o cursor dentro do cartão */}
          <div
            aria-hidden
            className="login-cartao-luz pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          <div
            aria-hidden
            className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
          />

          <div className="relative">
            <LogoAnimado />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">{saudacao(agora.getHours())}</h1>

            <form onSubmit={entrar} className="mt-6 grid gap-3" noValidate>
              <Campo
                id="email"
                name="email"
                rotulo="E-mail"
                icone={MailIcon}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErro(null)
                }}
                disabled={ocupado}
                aria-invalid={!!erro}
              />
              <Campo
                id="senha"
                name="senha"
                ref={senhaRef}
                rotulo="Senha"
                icone={LockIcon}
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value)
                  setErro(null)
                }}
                onKeyDown={verificarCapsLock}
                onKeyUp={verificarCapsLock}
                onBlur={() => setCapsLock(false)}
                disabled={ocupado}
                aria-invalid={!!erro}
                className="pr-11"
                acessorio={
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/40 transition-colors hover:text-white"
                    aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {verSenha ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                }
              />

              <div aria-live="polite" className="min-h-5 text-xs">
                {erro ? (
                  <p className="flex items-center gap-1.5 text-red-300">
                    <TriangleAlertIcon className="size-3.5 shrink-0" />
                    {erro}
                  </p>
                ) : capsLock ? (
                  <p className="flex items-center gap-1.5 text-amber-300">
                    <TriangleAlertIcon className="size-3.5 shrink-0" />
                    Caps Lock ativado
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={ocupado}
                className={cn(
                  'login-botao relative h-12 overflow-hidden rounded-xl font-medium transition-all duration-300',
                  'focus-visible:ring-4 focus-visible:ring-emerald-400/30 focus-visible:outline-none',
                  estado === 'sucesso'
                    ? 'bg-emerald-400 text-emerald-950'
                    : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 hover:shadow-[0_0_28px_-4px] hover:shadow-emerald-400/60',
                  'disabled:cursor-default',
                )}
              >
                <span
                  aria-hidden
                  className="login-reflexo absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
                <span className="group/rotulo relative flex items-center justify-center gap-2">
                  {estado === 'entrando' ? (
                    <>
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      Verificando…
                    </>
                  ) : estado === 'sucesso' ? (
                    <>
                      <CheckIcon className="motion-safe:animate-in motion-safe:zoom-in size-4" strokeWidth={3} />
                      Acesso liberado
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRightIcon className="size-4 transition-transform group-hover/rotulo:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-7 flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[11px] text-white/35">
              <span className="flex items-center gap-1.5">
                <span className="relative flex size-1.5">
                  {online && (
                    <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                  )}
                  <span
                    className={cn('relative inline-flex size-1.5 rounded-full', online ? 'bg-emerald-400' : 'bg-amber-400')}
                  />
                </span>
                {online ? 'online' : 'sem conexão'}
              </span>
              <time dateTime={agora.toISOString()} className="tabular-nums">
                {agora.toLocaleTimeString('pt-BR')}
              </time>
            </div>
          </div>
        </div>
      </main>
    </FundoTecnologico>
  )
}
