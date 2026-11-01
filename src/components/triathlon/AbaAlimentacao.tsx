import { useMemo, useState, type FormEvent } from 'react'
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FlameIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAlimentos,
  useCopiarRefeicoes,
  useExcluirAlimento,
  useExcluirRefeicao,
  usePerfilAtleta,
  usePesagens,
  useRefeicoes,
  useSalvarAlimento,
  useSalvarRefeicao,
  useTreinosPeriodo,
} from '@/hooks/useTriathlon'
import { dataLocal, formatarDecimal, formatarInteiro, pesoEm, somarDias, taxaBasal } from '@/lib/triathlon'
import { normalizar } from '@/lib/texto'
import { cn } from '@/lib/utils'
import type { Alimento, Macros, Refeicao, TipoRefeicao } from '@/types/triathlon'

export const TIPOS_REFEICAO: { valor: TipoRefeicao; rotulo: string }[] = [
  { valor: 'cafe', rotulo: 'Café da manhã' },
  { valor: 'lanche_manha', rotulo: 'Lanche da manhã' },
  { valor: 'almoco', rotulo: 'Almoço' },
  { valor: 'lanche_tarde', rotulo: 'Lanche da tarde' },
  { valor: 'pre_treino', rotulo: 'Pré-treino' },
  { valor: 'pos_treino', rotulo: 'Pós-treino' },
  { valor: 'jantar', rotulo: 'Jantar' },
  { valor: 'ceia', rotulo: 'Ceia' },
  { valor: 'suplemento', rotulo: 'Suplementos' },
]
const ROTULO_TIPO = Object.fromEntries(TIPOS_REFEICAO.map((t) => [t.valor, t.rotulo])) as Record<TipoRefeicao, string>

function tipoPelaHora(): TipoRefeicao {
  const h = new Date().getHours()
  if (h < 10) return 'cafe'
  if (h < 12) return 'lanche_manha'
  if (h < 15) return 'almoco'
  if (h < 18) return 'lanche_tarde'
  if (h < 22) return 'jantar'
  return 'ceia'
}

const somarMacros = (lista: Macros[]): Macros =>
  lista.reduce(
    (s, x) => ({
      kcal: s.kcal + x.kcal,
      proteina_g: s.proteina_g + x.proteina_g,
      carbo_g: s.carbo_g + x.carbo_g,
      gordura_g: s.gordura_g + x.gordura_g,
    }),
    { kcal: 0, proteina_g: 0, carbo_g: 0, gordura_g: 0 },
  )

const lerNumero = (t: string) => {
  const n = Number(t.trim().replace(',', '.') || '0')
  return Number.isFinite(n) && n >= 0 ? n : NaN
}
const textoMacro = (n: number) => formatarDecimal(Number(n.toFixed(1)))

function BarraMeta({ rotulo, valor, meta, unidade }: { rotulo: string; valor: number; meta: number | null; unidade: string }) {
  const fracao = meta ? Math.min(valor / meta, 1.25) : 0
  const passou = meta !== null && valor > meta * 1.05
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{rotulo}</span>
        <span className="text-muted-foreground tabular-nums">
          <span className={cn('text-foreground font-medium', passou && 'text-amber-700 dark:text-amber-400')}>
            {formatarInteiro(valor)}
          </span>
          {meta ? ` / ${formatarInteiro(meta)}` : ''} {unidade}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', passou ? 'bg-amber-500' : 'bg-primary')}
          style={{ width: `${meta ? Math.min(fracao, 1) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Diálogo: adicionar / editar item
// -----------------------------------------------------------------------------

function FormRefeicao({ data, item, onFechar }: { data: string; item: Refeicao | null; onFechar: () => void }) {
  const alimentos = useAlimentos()
  const salvar = useSalvarRefeicao()
  const salvarAlimento = useSalvarAlimento()
  const [tipo, setTipo] = useState<TipoRefeicao>(item?.tipo ?? tipoPelaHora())
  const [modo, setModo] = useState<'salvos' | 'digitar'>(item ? 'digitar' : 'salvos')
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState<Alimento | null>(null)
  const [quantidade, setQuantidade] = useState('1')
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [kcal, setKcal] = useState(item ? String(item.kcal) : '')
  const [proteina, setProteina] = useState(item ? String(item.proteina_g).replace('.', ',') : '')
  const [carbo, setCarbo] = useState(item ? String(item.carbo_g).replace('.', ',') : '')
  const [gordura, setGordura] = useState(item ? String(item.gordura_g).replace('.', ',') : '')
  const [guardar, setGuardar] = useState(false)
  const [porcao, setPorcao] = useState('1 porção')

  const filtrados = (alimentos.data ?? []).filter((a) => normalizar(a.nome).includes(normalizar(busca.trim())))
  const fator = lerNumero(quantidade)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    let dados: Omit<Refeicao, 'id' | 'created_at'>
    if (modo === 'salvos') {
      if (!escolhido) return toast.error('Escolha um alimento da lista.')
      if (!fator || Number.isNaN(fator)) return toast.error('Quantidade inválida.')
      const q = (n: number) => Number((n * fator).toFixed(1))
      dados = {
        data,
        tipo,
        descricao: fator === 1 ? `${escolhido.nome} (${escolhido.porcao})` : `${escolhido.nome} — ${formatarDecimal(fator)} × ${escolhido.porcao}`,
        kcal: Math.round(escolhido.kcal * fator),
        proteina_g: q(escolhido.proteina_g),
        carbo_g: q(escolhido.carbo_g),
        gordura_g: q(escolhido.gordura_g),
      }
    } else {
      const valores = [kcal, proteina, carbo, gordura].map(lerNumero)
      if (!descricao.trim()) return toast.error('Descreva o que você comeu.')
      if (valores.some(Number.isNaN)) return toast.error('Algum número está inválido.')
      dados = {
        data,
        tipo,
        descricao: descricao.trim(),
        kcal: Math.round(valores[0]),
        proteina_g: valores[1],
        carbo_g: valores[2],
        gordura_g: valores[3],
      }
    }
    try {
      await salvar.mutateAsync({ id: item?.id, dados })
      if (modo === 'digitar' && guardar) {
        await salvarAlimento.mutateAsync({
          dados: { nome: dados.descricao, porcao: porcao.trim() || '1 porção', kcal: dados.kcal, proteina_g: dados.proteina_g, carbo_g: dados.carbo_g, gordura_g: dados.gordura_g },
        })
      }
      toast.success(item ? 'Item atualizado.' : 'Adicionado.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{item ? 'Editar item' : 'Adicionar à alimentação'}</DialogTitle>
        <DialogDescription>{new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'full' })}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="tipo-refeicao" className="text-xs">
          Refeição
        </Label>
        <NativeSelect id="tipo-refeicao" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRefeicao)}>
          {TIPOS_REFEICAO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </NativeSelect>
      </div>

      {!item && (
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup">
          {(
            [
              ['salvos', 'Meus alimentos'],
              ['digitar', 'Digitar valores'],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={modo === v}
              onClick={() => setModo(v)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium', modo === v ? 'bg-background shadow-sm' : 'text-muted-foreground')}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {modo === 'salvos' ? (
        <div className="grid gap-3">
          {(alimentos.data ?? []).length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
              Você ainda não salvou alimentos. Use “Digitar valores” e marque “Salvar nos meus alimentos”.
            </p>
          ) : (
            <>
              <div className="relative">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input className="pl-9" placeholder="Buscar alimento" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {filtrados.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setEscolhido(a)}
                      className={cn('flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm', escolhido?.id === a.id ? 'bg-primary/10' : 'hover:bg-accent')}
                    >
                      <span>
                        <span className="font-medium">{a.nome}</span>
                        <span className="text-muted-foreground"> · {a.porcao}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">{a.kcal} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="qtd" className="text-xs">
                    Quantidade (porções)
                  </Label>
                  <Input id="qtd" inputMode="decimal" className="w-28" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                </div>
                {escolhido && fator > 0 && (
                  <p className="text-muted-foreground pb-2 text-sm tabular-nums">
                    = {Math.round(escolhido.kcal * fator)} kcal · P {textoMacro(escolhido.proteina_g * fator)} g · C {textoMacro(escolhido.carbo_g * fator)} g · G{' '}
                    {textoMacro(escolhido.gordura_g * fator)} g
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="descricao-refeicao" className="text-xs">
              O que você comeu
            </Label>
            <Input id="descricao-refeicao" placeholder="Ex.: Arroz, feijão e frango grelhado" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ['kcal', 'kcal', kcal, setKcal],
                ['proteina', 'Proteína (g)', proteina, setProteina],
                ['carbo', 'Carbo (g)', carbo, setCarbo],
                ['gordura', 'Gordura (g)', gordura, setGordura],
              ] as const
            ).map(([id, rotulo, valor, setter]) => (
              <div key={id} className="grid gap-1.5">
                <Label htmlFor={`m-${id}`} className="text-xs">
                  {rotulo}
                </Label>
                <Input id={`m-${id}`} inputMode="decimal" value={valor} onChange={(e) => setter(e.target.value)} />
              </div>
            ))}
          </div>
          {!item && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={guardar} onCheckedChange={(v) => setGuardar(v === true)} />
                Salvar nos meus alimentos
              </label>
              {guardar && (
                <Input className="h-8 w-40" placeholder="Porção (ex.: 1 prato)" value={porcao} onChange={(e) => setPorcao(e.target.value)} aria-label="Porção" />
              )}
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          {item ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// -----------------------------------------------------------------------------
// Diálogo: meus alimentos
// -----------------------------------------------------------------------------

function DialogAlimentos({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const alimentos = useAlimentos()
  const salvar = useSalvarAlimento()
  const excluir = useExcluirAlimento()
  const vazio = { nome: '', porcao: '1 porção', kcal: '', proteina: '', carbo: '', gordura: '' }
  const [editando, setEditando] = useState<string | null>(null)
  const [f, setF] = useState(vazio)

  function editar(a: Alimento) {
    setEditando(a.id)
    setF({
      nome: a.nome,
      porcao: a.porcao,
      kcal: String(a.kcal),
      proteina: String(a.proteina_g).replace('.', ','),
      carbo: String(a.carbo_g).replace('.', ','),
      gordura: String(a.gordura_g).replace('.', ','),
    })
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const [kcal, p, c, g] = [f.kcal, f.proteina, f.carbo, f.gordura].map(lerNumero)
    if (!f.nome.trim()) return toast.error('Informe o nome.')
    if ([kcal, p, c, g].some(Number.isNaN)) return toast.error('Algum número está inválido.')
    try {
      await salvar.mutateAsync({
        id: editando ?? undefined,
        dados: { nome: f.nome.trim(), porcao: f.porcao.trim() || '1 porção', kcal: Math.round(kcal), proteina_g: p, carbo_g: c, gordura_g: g },
      })
      setEditando(null)
      setF(vazio)
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Meus alimentos</DialogTitle>
          <DialogDescription>Salve o que você come com frequência (valores por porção) para lançar com um toque.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-2 rounded-lg border p-3">
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <Input placeholder="Nome (ex.: Ovo cozido)" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} aria-label="Nome" />
            <Input placeholder="Porção" value={f.porcao} onChange={(e) => setF({ ...f, porcao: e.target.value })} aria-label="Porção" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ['kcal', 'kcal'],
                ['proteina', 'Prot. (g)'],
                ['carbo', 'Carbo (g)'],
                ['gordura', 'Gord. (g)'],
              ] as const
            ).map(([k, r]) => (
              <Input key={k} inputMode="decimal" placeholder={r} aria-label={r} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            {editando && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setEditando(null); setF(vazio) }}>
                Cancelar edição
              </Button>
            )}
            <Button type="submit" size="sm" disabled={salvar.isPending}>
              {editando ? 'Salvar alterações' : 'Adicionar alimento'}
            </Button>
          </div>
        </form>
        <ul className="max-h-[40dvh] divide-y overflow-y-auto">
          {(alimentos.data ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.nome}</div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {a.porcao} · {a.kcal} kcal · P {textoMacro(a.proteina_g)} · C {textoMacro(a.carbo_g)} · G {textoMacro(a.gordura_g)}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Editar ${a.nome}`} onClick={() => editar(a)}>
                <PencilIcon />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Excluir ${a.nome}`} onClick={() => excluir.mutate(a.id)}>
                <Trash2Icon />
              </Button>
            </li>
          ))}
          {!alimentos.data?.length && <li className="text-muted-foreground py-4 text-center text-sm">Nenhum alimento salvo.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Aba
// -----------------------------------------------------------------------------

export function AbaAlimentacao() {
  const hoje = dataLocal(new Date())
  const [data, setData] = useState(hoje)
  const refeicoes = useRefeicoes(data)
  const perfil = usePerfilAtleta()
  const pesagens = usePesagens()
  const treinosDia = useTreinosPeriodo(data, data)
  const excluir = useExcluirRefeicao()
  const copiar = useCopiarRefeicoes()
  const [editor, setEditor] = useState<{ aberto: boolean; item: Refeicao | null }>({ aberto: false, item: null })
  const [gerenciando, setGerenciando] = useState(false)

  const itens = refeicoes.data ?? []
  const total = useMemo(() => somarMacros(itens), [itens])
  const gastoTreinos = (treinosDia.data ?? []).reduce((s, t) => s + (t.calorias ?? 0), 0)
  const basal = taxaBasal(perfil.data, pesoEm(pesagens.data ?? [], data))
  // gasto do dia ≈ basal × 1,2 (atividades do dia a dia) + calorias dos treinos
  const gastoEstimado = basal ? Math.round(basal * 1.2 + gastoTreinos) : null
  const p = perfil.data

  async function repetirOntem() {
    try {
      const n = await copiar.mutateAsync({ de: somarDias(data, -1), para: data })
      if (n === 0) toast.info('Não há nada registrado no dia anterior.')
      else toast.success(`${n} item(ns) copiado(s) do dia anterior.`)
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Dia anterior" onClick={() => setData(somarDias(data, -1))}>
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-44 px-1 text-center">
            <div className="font-semibold">
              {(() => {
                const texto = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
                return texto.charAt(0).toUpperCase() + texto.slice(1)
              })()}
            </div>
            {data === hoje ? (
              <div className="text-muted-foreground text-xs">hoje</div>
            ) : (
              <button type="button" className="text-primary text-xs font-medium hover:underline" onClick={() => setData(hoje)}>
                voltar para hoje
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" aria-label="Próximo dia" onClick={() => setData(somarDias(data, 1))} disabled={data >= hoje}>
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setGerenciando(true)}>
            <BookmarkIcon />
            Meus alimentos
          </Button>
          {itens.length === 0 && (
            <Button variant="outline" size="sm" onClick={repetirOntem} disabled={copiar.isPending}>
              <CopyIcon />
              Repetir dia anterior
            </Button>
          )}
          <Button size="sm" onClick={() => setEditor({ aberto: true, item: null })}>
            <PlusIcon />
            Adicionar
          </Button>
        </div>
      </div>

      <Card className="gap-4 px-4 py-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <BarraMeta rotulo="Calorias" valor={total.kcal} meta={p?.kcal_meta ?? null} unidade="kcal" />
          <BarraMeta rotulo="Proteína" valor={total.proteina_g} meta={p?.proteina_meta_g ?? null} unidade="g" />
          <BarraMeta rotulo="Carboidrato" valor={total.carbo_g} meta={p?.carbo_meta_g ?? null} unidade="g" />
          <BarraMeta rotulo="Gordura" valor={total.gordura_g} meta={p?.gordura_meta_g ?? null} unidade="g" />
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-sm">
          <span className="flex items-center gap-1.5">
            <FlameIcon className="size-4 text-orange-600 dark:text-orange-400" />
            Treinos do dia: <strong className="text-foreground tabular-nums">{formatarInteiro(gastoTreinos)} kcal</strong>
          </span>
          {gastoEstimado ? (
            <span>
              Balanço estimado:{' '}
              <strong className={cn('tabular-nums', total.kcal - gastoEstimado < 0 ? 'text-blue-700 dark:text-blue-400' : 'text-foreground')}>
                {total.kcal - gastoEstimado > 0 ? '+' : ''}
                {formatarInteiro(total.kcal - gastoEstimado)} kcal
              </strong>{' '}
              <span className="text-xs">(gasto ≈ {formatarInteiro(gastoEstimado)} kcal: basal × 1,2 + treinos)</span>
            </span>
          ) : (
            <span className="text-xs">Preencha nascimento, sexo, altura e peso em Corpo para estimar o balanço.</span>
          )}
          {!p?.kcal_meta && <span className="text-xs">Defina metas de calorias e macros no Perfil do atleta.</span>}
        </div>
      </Card>

      {refeicoes.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : itens.length === 0 ? (
        <Card className="items-center gap-2 px-6 py-10 text-center">
          <p className="font-medium">Nada registrado neste dia</p>
          <p className="text-muted-foreground text-sm">Toque em “Adicionar” para lançar o que você comeu.</p>
        </Card>
      ) : (
        <div className={cn('grid gap-3 sm:grid-cols-2', refeicoes.isPlaceholderData && 'opacity-60')}>
          {TIPOS_REFEICAO.filter((t) => itens.some((i) => i.tipo === t.valor)).map((t) => {
            const doTipo = itens.filter((i) => i.tipo === t.valor)
            const sub = somarMacros(doTipo)
            return (
              <Card key={t.valor} className="gap-0 overflow-hidden py-0">
                <div className="bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-sm">
                  <span className="font-medium">{ROTULO_TIPO[t.valor]}</span>
                  <span className="text-muted-foreground tabular-nums">{formatarInteiro(sub.kcal)} kcal</span>
                </div>
                <ul className="divide-y">
                  {doTipo.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 py-2 pr-2 pl-4 text-sm">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditor({ aberto: true, item: i })}>
                        <div className="truncate">{i.descricao}</div>
                        <div className="text-muted-foreground text-xs tabular-nums">
                          {i.kcal} kcal · P {textoMacro(i.proteina_g)} · C {textoMacro(i.carbo_g)} · G {textoMacro(i.gordura_g)}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remover ${i.descricao}`}
                        onClick={() => excluir.mutate(i.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={editor.aberto} onOpenChange={(v) => !v && setEditor({ aberto: false, item: null })}>
        <DialogContent>
          {editor.aberto && (
            <FormRefeicao key={editor.item?.id ?? 'novo'} data={data} item={editor.item} onFechar={() => setEditor({ aberto: false, item: null })} />
          )}
        </DialogContent>
      </Dialog>
      <DialogAlimentos aberto={gerenciando} onFechar={() => setGerenciando(false)} />
    </div>
  )
}
