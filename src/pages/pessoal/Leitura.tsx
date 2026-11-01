import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AArrowDownIcon,
  AArrowUpIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  MoonIcon,
  NotebookPenIcon,
  SunIcon,
  Undo2Icon,
} from 'lucide-react'
import { toast } from 'sonner'

import { AvisoSemTexto } from '@/components/pessoal/biblia/CardLeituraHoje'
import { DialogAnotacao, DialogMarcacao } from '@/components/pessoal/biblia/Dialogos'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAnotacoes,
  useCapitulo,
  useCapitulosLidos,
  useConcluirCapitulo,
  useDesmarcarCapitulo,
  useLivros,
  useMarcacoes,
} from '@/hooks/useBiblia'
import { useTema } from '@/hooks/useTema'
import { mensagemErro } from '@/lib/erros'
import { formatarData } from '@/lib/format'
import { CORES_MARCACAO, diaSP, referencia, vizinho } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import { rotaLeitura, ROTAS_PESSOAL } from '@/modulos'
import type { RefCapitulo, Versiculo } from '@/types/pessoal'

const TAMANHOS = [15, 17, 19, 22, 26]
const CHAVE_FONTE = 'leitura:fonte'

function lerFonte(): number {
  try {
    const v = Number(localStorage.getItem(CHAVE_FONTE))
    return Number.isInteger(v) && v >= 0 && v < TAMANHOS.length ? v : 1
  } catch {
    return 1
  }
}

function guardarFonte(v: number) {
  try {
    localStorage.setItem(CHAVE_FONTE, String(v))
  } catch {
    // armazenamento indisponível: vale só nesta visita
  }
}

export default function Leitura() {
  const params = useParams()
  const livro = Number(params.livro)
  const capitulo = Number(params.capitulo)
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { escuro, setTema } = useTema()

  const livros = useLivros()
  const texto = useCapitulo(livro, capitulo)
  const lidos = useCapitulosLidos()
  const marcacoes = useMarcacoes(livro, capitulo)
  const anotacoes = useAnotacoes()
  const concluir = useConcluirCapitulo()
  const desmarcar = useDesmarcarCapitulo()

  const [fonte, setFonte] = useState(lerFonte)
  const [selecionado, setSelecionado] = useState<Versiculo | null>(null)
  const [depois, setDepois] = useState<{ proximo: RefCapitulo | null } | null>(null)

  const info = livros.data?.find((l) => l.id === livro)
  const valido = Boolean(info && Number.isInteger(capitulo) && capitulo >= 1 && capitulo <= info.total_capitulos)
  const titulo = referencia(livros.data, livro, capitulo)
  const lido = lidos.data?.find((l) => l.livro_id === livro && l.capitulo === capitulo)
  const anterior = livros.data ? vizinho(livros.data, livro, capitulo, -1) : null
  const seguinte = livros.data ? vizinho(livros.data, livro, capitulo, 1) : null
  const marcadoPor = new Map((marcacoes.data ?? []).map((m) => [m.versiculo_id, m]))
  const notasDoCapitulo = (anotacoes.data ?? []).filter((a) => a.livro_id === livro && a.capitulo === capitulo)

  // ao trocar de capítulo, volta ao topo (ou vai ao versículo do link, ex.: #v16)
  useEffect(() => {
    if (!texto.data) return
    const alvo = hash ? document.getElementById(hash.slice(1)) : null
    if (alvo) alvo.scrollIntoView({ block: 'center' })
    else window.scrollTo({ top: 0 })
  }, [livro, capitulo, hash, texto.data])

  function mudarFonte(passo: number) {
    const v = Math.max(0, Math.min(TAMANHOS.length - 1, fonte + passo))
    setFonte(v)
    guardarFonte(v)
  }

  async function concluirCapitulo() {
    try {
      const proximo = await concluir.mutateAsync({ livro_id: livro, capitulo })
      setDepois({ proximo })
    } catch {
      // erro já exibido pelo hook
    }
  }

  function seguirParaProximo() {
    const proximo = depois?.proximo
    setDepois(null)
    navigate(proximo ? rotaLeitura(proximo.livro_id, proximo.capitulo) : ROTAS_PESSOAL.biblia)
  }

  function teclaVersiculo(e: KeyboardEvent, v: Versiculo) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelecionado(v)
    }
  }

  if (livros.isPending) return <Skeleton className="mx-auto h-96 max-w-2xl" />
  if (!valido) {
    return (
      <div className="mx-auto grid max-w-2xl gap-3 py-10 text-center">
        <p className="font-medium">Capítulo não encontrado.</p>
        <Button asChild variant="outline" className="mx-auto w-fit">
          <Link to={ROTAS_PESSOAL.biblia}>Voltar para a Bíblia</Link>
        </Button>
      </div>
    )
  }

  return (
    <article className="mx-auto grid max-w-2xl gap-5">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={ROTAS_PESSOAL.biblia}>
            <ChevronLeftIcon />
            Livros
          </Link>
        </Button>
        <div className="flex items-center gap-1" role="group" aria-label="Leitura">
          <Button variant="ghost" size="icon" aria-label="Diminuir a letra" disabled={fonte === 0} onClick={() => mudarFonte(-1)}>
            <AArrowDownIcon />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Aumentar a letra" disabled={fonte === TAMANHOS.length - 1} onClick={() => mudarFonte(1)}>
            <AArrowUpIcon />
          </Button>
          <Button variant="ghost" size="icon" aria-label={escuro ? 'Modo claro' : 'Modo escuro'} onClick={() => setTema(escuro ? 'claro' : 'escuro')}>
            {escuro ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </div>

      <header className="text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{titulo}</h1>
        {lido && (
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            Lido em {formatarData(diaSP(lido.concluido_em))}
          </p>
        )}
      </header>

      {texto.isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      ) : texto.error ? (
        <p className="text-destructive text-sm">{mensagemErro(texto.error)}</p>
      ) : texto.data.length === 0 ? (
        <AvisoSemTexto />
      ) : (
        <div className="font-serif leading-[1.8]" style={{ fontSize: TAMANHOS[fonte] }}>
          <p className="text-muted-foreground mb-3 text-center font-sans text-xs">Toque em um versículo para marcá-lo com uma cor.</p>
          {texto.data.map((v) => {
            const m = marcadoPor.get(v.id)
            return (
              <span
                key={v.id}
                id={`v${v.versiculo}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelecionado(v)}
                onKeyDown={(e) => teclaVersiculo(e, v)}
                aria-label={`Versículo ${v.versiculo}${m ? `, marcado de ${CORES_MARCACAO[m.cor].rotulo.toLowerCase()}` : ''}`}
                className={cn(
                  'focus-visible:ring-ring/50 cursor-pointer rounded-sm transition-colors outline-none focus-visible:ring-2',
                  m ? CORES_MARCACAO[m.cor].fundo : 'hover:bg-accent/60',
                )}
              >
                <sup className="text-muted-foreground mr-0.5 font-sans text-[0.6em] font-semibold select-none">{v.versiculo}</sup>
                {v.texto}{' '}
              </span>
            )
          })}
        </div>
      )}

      {notasDoCapitulo.length > 0 && (
        <section className="bg-muted/40 grid gap-2 rounded-xl border p-4 text-sm" aria-label="Suas anotações">
          <h2 className="flex items-center gap-2 font-medium">
            <NotebookPenIcon className="size-4" />
            Suas anotações
          </h2>
          {notasDoCapitulo.map((a) => (
            <div key={a.id} className="grid gap-1 border-t pt-2 first-of-type:border-t-0 first-of-type:pt-0">
              {a.versiculo_destaque && <p className="text-muted-foreground text-xs">Versículo {a.versiculo_destaque}</p>}
              {a.reflexao && <p className="whitespace-pre-line">{a.reflexao}</p>}
              {a.aplicacao && <p className="text-muted-foreground whitespace-pre-line">Aplicação: {a.aplicacao}</p>}
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-2">
        {lido ? (
          <Button
            variant="outline"
            disabled={desmarcar.isPending}
            onClick={() => desmarcar.mutate({ livro_id: livro, capitulo }, { onSuccess: () => toast.success('Capítulo desmarcado.') })}
          >
            {desmarcar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <Undo2Icon />}
            Desmarcar (concluído por engano)
          </Button>
        ) : (
          <Button size="lg" className="h-12 text-base" disabled={concluir.isPending} onClick={concluirCapitulo}>
            {concluir.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CheckCircle2Icon />}
            Concluir capítulo
          </Button>
        )}
        <nav className="grid grid-cols-2 gap-2" aria-label="Capítulos">
          {anterior ? (
            <Button asChild variant="ghost" className="justify-start">
              <Link to={rotaLeitura(anterior.livro_id, anterior.capitulo)}>
                <ChevronLeftIcon />
                {referencia(livros.data, anterior.livro_id, anterior.capitulo, null, true)}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {seguinte && (
            <Button asChild variant="ghost" className="justify-end">
              <Link to={rotaLeitura(seguinte.livro_id, seguinte.capitulo)}>
                {referencia(livros.data, seguinte.livro_id, seguinte.capitulo, null, true)}
                <ChevronRightIcon />
              </Link>
            </Button>
          )}
        </nav>
      </div>

      <DialogMarcacao
        referencia={selecionado ? referencia(livros.data, livro, capitulo, selecionado.versiculo) : ''}
        versiculo={selecionado}
        marcacao={selecionado ? marcadoPor.get(selecionado.id) : undefined}
        onFechar={() => setSelecionado(null)}
      />
      <DialogAnotacao
        aberto={depois !== null}
        livro={livro}
        capitulo={capitulo}
        titulo={titulo}
        versiculos={texto.data ?? []}
        onFim={seguirParaProximo}
      />
    </article>
  )
}
