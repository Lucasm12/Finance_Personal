import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { IconeArea } from '@/components/pessoal/Comum'
import { SeletorCor } from '@/components/SeletorCor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  useAreas,
  useCriarMarcos,
  useExcluirArea,
  useExcluirObjetivo,
  useExcluirProgresso,
  useObjetivos,
  useProgressoMeta,
  useRegistrarProgresso,
  useSalvarArea,
  useSalvarMeta,
  useSalvarObjetivo,
} from '@/hooks/usePessoal'
import { useProvas } from '@/hooks/useTriathlon'
import { proximaCor } from '@/lib/cores'
import { formatarData } from '@/lib/format'
import { CRITERIOS_TREINO, formatarQuantidade, hojeSP, ICONES_AREA, STATUS_META, TIPO_META } from '@/lib/pessoal'
import { normalizar } from '@/lib/texto'
import { MODALIDADES, ORDEM_MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { AreaVida, CriterioTreino, MetaInput, MetaSituacao, Objetivo, StatusMeta, TipoMeta } from '@/types/pessoal'
import type { Modalidade } from '@/types/triathlon'

/** "1.234,5" ou "1234.5" → 1234.5 */
const lerNumero = (t: string) => {
  const v = t.trim()
  if (!v) return null
  return Number(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v)
}
const textoNumero = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

/** A área é a de Saúde? (as metas ligadas aos treinos ficam nela) */
export const ehSaude = (area: AreaVida | undefined) => Boolean(area && (area.icone === 'saude' || normalizar(area.nome) === 'saude'))

function Erro({ children }: { children: string }) {
  return children ? (
    <p className="text-destructive text-sm" role="alert">
      {children}
    </p>
  ) : null
}

// -----------------------------------------------------------------------------
// Objetivo
// -----------------------------------------------------------------------------

function FormObjetivo({ objetivo, ano, areaInicial, onFechar }: { objetivo: Objetivo | null; ano: number; areaInicial?: string; onFechar: () => void }) {
  const areas = useAreas()
  const salvar = useSalvarObjetivo()
  const excluir = useExcluirObjetivo()
  const [titulo, setTitulo] = useState(objetivo?.titulo ?? '')
  const [areaEscolhida, setAreaId] = useState(objetivo?.area_id ?? areaInicial ?? '')
  const areaId = areaEscolhida || areas.data?.[0]?.id || ''
  const [anoObj, setAnoObj] = useState(String(objetivo?.ano ?? ano))
  const [descricao, setDescricao] = useState(objetivo?.descricao ?? '')
  const [status, setStatus] = useState<StatusMeta>(objetivo?.status ?? 'em_andamento')
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return setErro('Dê um título ao objetivo.')
    if (!areaId) return setErro('Escolha a área da vida.')
    const n = Number(anoObj)
    if (!Number.isInteger(n) || n < 2000 || n > 2100) return setErro('Ano inválido.')
    try {
      await salvar.mutateAsync({
        id: objetivo?.id,
        dados: { titulo: titulo.trim(), area_id: areaId, ano: n, descricao: descricao.trim() || null, status },
      })
      toast.success(objetivo ? 'Objetivo atualizado.' : 'Objetivo criado. Agora adicione metas a ele.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{objetivo ? 'Editar objetivo' : 'Novo objetivo do ano'}</DialogTitle>
        <DialogDescription>O objetivo é o “o quê”; as metas dentro dele dizem como medir.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="obj-titulo">Objetivo</Label>
        <Input id="obj-titulo" maxLength={200} placeholder="Ex.: Ter uma vida financeira tranquila" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="obj-area">Área da vida</Label>
          <NativeSelect id="obj-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            {(areas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="obj-ano">Ano</Label>
          <Input id="obj-ano" inputMode="numeric" value={anoObj} onChange={(e) => setAnoObj(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="obj-descricao">Por que é importante (opcional)</Label>
        <Textarea id="obj-descricao" rows={2} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      {objetivo && (
        <div className="grid gap-1.5">
          <Label htmlFor="obj-status">Situação</Label>
          <NativeSelect id="obj-status" value={status} onChange={(e) => setStatus(e.target.value as StatusMeta)}>
            {(Object.keys(STATUS_META) as StatusMeta[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <Erro>{erro}</Erro>
      <DialogFooter className="sm:justify-between">
        {objetivo ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (!confirmando) return setConfirmando(true)
              excluir.mutate(objetivo.id, { onSuccess: () => toast.success('Objetivo e metas excluídos.') })
              onFechar()
            }}
          >
            <Trash2Icon />
            {confirmando ? 'Confirmar: apaga as metas também' : 'Excluir'}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

export function DialogObjetivo({
  aberto,
  ...props
}: {
  aberto: boolean
  objetivo: Objetivo | null
  ano: number
  areaInicial?: string
  onFechar: () => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && props.onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{aberto && <FormObjetivo {...props} />}</DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Meta
// -----------------------------------------------------------------------------

type Origem = 'manual' | 'treino'

function FormMeta({ meta, objetivoInicial, ano, onFechar }: { meta: MetaSituacao | null; objetivoInicial?: string; ano: number; onFechar: () => void }) {
  const objetivos = useObjetivos()
  const areas = useAreas()
  const provas = useProvas()
  const salvar = useSalvarMeta()
  const criarMarcos = useCriarMarcos()
  const automaticaBiblia = meta?.origem_automatica === 'biblia'

  const [objetivoId, setObjetivoId] = useState(meta?.objetivo_id ?? objetivoInicial ?? '')
  const [titulo, setTitulo] = useState(meta?.titulo ?? '')
  const [tipo, setTipo] = useState<TipoMeta>(meta?.tipo ?? 'numerica')
  const [origem, setOrigem] = useState<Origem>(meta?.origem_automatica === 'treino' ? 'treino' : 'manual')
  const [criterio, setCriterio] = useState<CriterioTreino>(meta?.treino_criterio ?? 'sessoes')
  const [modalidade, setModalidade] = useState<Modalidade | ''>(meta?.treino_modalidade ?? '')
  const [porSemana, setPorSemana] = useState(String(meta?.treino_por_semana ?? 4))
  const [provaId, setProvaId] = useState(meta?.prova_id ?? '')
  const [alvo, setAlvo] = useState(textoNumero(meta?.valor_alvo))
  const [unidade, setUnidade] = useState(meta?.unidade ?? '')
  const [inicio, setInicio] = useState(meta?.inicio ?? hojeSP())
  const [prazo, setPrazo] = useState(meta?.prazo ?? `${ano}-12-31`)
  const [status, setStatus] = useState<StatusMeta>(meta?.status ?? 'em_andamento')
  const [marcos, setMarcos] = useState('')
  const [erro, setErro] = useState('')

  const objetivo = objetivos.data?.find((o) => o.id === objetivoId)
  const saude = ehSaude(areas.data?.find((a) => a.id === objetivo?.area_id))
  const treino = tipo === 'numerica' && origem === 'treino' && saude
  const opcoesObjetivo = (objetivos.data ?? []).filter((o) => o.ano === (objetivo?.ano ?? ano) || o.id === objetivoId)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!objetivoId) return setErro('Escolha o objetivo.')
    if (!titulo.trim()) return setErro('Dê um título à meta.')
    if (prazo && inicio && prazo < inicio) return setErro('O prazo precisa ser depois do início.')

    let dados: Partial<MetaInput>
    if (automaticaBiblia) {
      dados = { titulo: titulo.trim(), status }
    } else {
      const valorAlvo = lerNumero(alvo)
      const precisaAlvo = tipo === 'numerica' && !(treino && (criterio === 'frequencia_semanal' || criterio === 'prova'))
      if (precisaAlvo && (valorAlvo === null || !Number.isFinite(valorAlvo) || valorAlvo <= 0)) return setErro('Informe o valor-alvo (maior que zero).')
      if (treino && criterio === 'frequencia_semanal') {
        const n = Number(porSemana)
        if (!Number.isInteger(n) || n < 1 || n > 14) return setErro('Vezes por semana: de 1 a 14.')
        if (!prazo) return setErro('Informe o prazo: o progresso é contado em semanas até ele.')
      }
      if (treino && criterio === 'prova' && !provaId) return setErro('Escolha a prova (cadastre em Triathlon → Provas).')
      dados = {
        objetivo_id: objetivoId,
        titulo: titulo.trim(),
        tipo,
        valor_alvo: precisaAlvo ? valorAlvo : null,
        unidade: tipo === 'numerica' ? (treino ? CRITERIOS_TREINO[criterio].unidade : unidade.trim() || null) : null,
        inicio,
        prazo: prazo || null,
        status,
        origem_automatica: treino ? 'treino' : 'nenhuma',
        treino_criterio: treino ? criterio : null,
        treino_modalidade: treino && criterio !== 'prova' && modalidade ? modalidade : null,
        treino_por_semana: treino && criterio === 'frequencia_semanal' ? Number(porSemana) : null,
        prova_id: treino && criterio === 'prova' ? provaId : null,
      }
    }
    try {
      const id = await salvar.mutateAsync({ id: meta?.id, dados })
      const etapas = marcos
        .split('\n')
        .map((t) => t.trim().slice(0, 200))
        .filter(Boolean)
      if (!meta && tipo === 'marcos' && etapas.length) await criarMarcos.mutateAsync({ meta_id: id, titulos: etapas })
      toast.success(meta ? 'Meta atualizada.' : 'Meta criada.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{meta ? 'Editar meta' : 'Nova meta'}</DialogTitle>
        <DialogDescription>
          {automaticaBiblia ? 'Esta meta é atualizada pela leitura da Bíblia; as datas seguem o seu plano de leitura.' : 'Metas mensuráveis: dá para saber se está em dia.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="meta-titulo">Meta</Label>
        <Input id="meta-titulo" maxLength={200} placeholder="Ex.: Ler 12 livros" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      {!automaticaBiblia && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="meta-objetivo">Objetivo</Label>
            <NativeSelect id="meta-objetivo" value={objetivoId} onChange={(e) => setObjetivoId(e.target.value)}>
              <option value="">Escolha…</option>
              {opcoesObjetivo.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titulo} ({areas.data?.find((a) => a.id === o.area_id)?.nome ?? 'sem área'})
                </option>
              ))}
            </NativeSelect>
          </div>

          <fieldset className="grid gap-2" disabled={Boolean(meta)}>
            <legend className="mb-1 text-sm font-medium">Tipo {meta && <span className="text-muted-foreground font-normal">(não muda depois de criada)</span>}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(TIPO_META) as TipoMeta[]).map((t) => (
                <label
                  key={t}
                  className={cn(
                    'flex cursor-pointer flex-col rounded-lg border p-2.5 text-sm has-[:disabled]:cursor-default has-[:disabled]:opacity-70',
                    tipo === t && 'border-primary bg-primary/5',
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input type="radio" name="tipo" checked={tipo === t} onChange={() => setTipo(t)} className="accent-primary" />
                    {TIPO_META[t].rotulo}
                  </span>
                  <span className="text-muted-foreground text-xs">{TIPO_META[t].descricao}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {tipo === 'numerica' && saude && (
            <div className="grid gap-1.5">
              <Label htmlFor="meta-origem">Como medir</Label>
              <NativeSelect id="meta-origem" value={origem} onChange={(e) => setOrigem(e.target.value as Origem)}>
                <option value="manual">Eu registro o progresso</option>
                <option value="treino">Automático, pelos treinos do Triathlon</option>
              </NativeSelect>
            </div>
          )}

          {treino && (
            <div className="bg-muted/40 grid gap-3 rounded-lg border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="meta-criterio">O que contar</Label>
                <NativeSelect id="meta-criterio" value={criterio} onChange={(e) => setCriterio(e.target.value as CriterioTreino)}>
                  {(Object.keys(CRITERIOS_TREINO) as CriterioTreino[]).map((c) => (
                    <option key={c} value={c}>
                      {CRITERIOS_TREINO[c].rotulo}
                    </option>
                  ))}
                </NativeSelect>
                <p className="text-muted-foreground text-xs">{CRITERIOS_TREINO[criterio].exemplo}</p>
              </div>
              {criterio === 'prova' ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="meta-prova">Prova-alvo</Label>
                  <NativeSelect id="meta-prova" value={provaId} onChange={(e) => setProvaId(e.target.value)}>
                    <option value="">Escolha…</option>
                    {(provas.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — {formatarData(p.data)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ) : (
                <div className={cn('grid gap-3', criterio === 'frequencia_semanal' && 'grid-cols-2')}>
                  <div className="grid gap-1.5">
                    <Label htmlFor="meta-modalidade">Modalidade</Label>
                    <NativeSelect id="meta-modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value as Modalidade | '')}>
                      <option value="">Todas</option>
                      {ORDEM_MODALIDADES.map((m) => (
                        <option key={m} value={m}>
                          {MODALIDADES[m].nome}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  {criterio === 'frequencia_semanal' && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="meta-semana">Vezes por semana</Label>
                      <Input id="meta-semana" inputMode="numeric" value={porSemana} onChange={(e) => setPorSemana(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tipo === 'numerica' && !(treino && (criterio === 'frequencia_semanal' || criterio === 'prova')) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="meta-alvo">Valor-alvo</Label>
                <Input id="meta-alvo" inputMode="decimal" placeholder="12" value={alvo} onChange={(e) => setAlvo(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="meta-unidade">Unidade</Label>
                {treino ? (
                  <Input id="meta-unidade" value={CRITERIOS_TREINO[criterio].unidade} disabled />
                ) : (
                  <Input id="meta-unidade" maxLength={30} placeholder="livros, km, R$…" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
                )}
              </div>
            </div>
          )}

          {tipo === 'marcos' && !meta && (
            <div className="grid gap-1.5">
              <Label htmlFor="meta-marcos">Etapas (uma por linha)</Label>
              <Textarea id="meta-marcos" rows={4} placeholder={'Escolher o curso\nFazer a matrícula\nConcluir o módulo 1'} value={marcos} onChange={(e) => setMarcos(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="meta-inicio">Início</Label>
              <Input id="meta-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="meta-prazo">Prazo</Label>
              <Input id="meta-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {meta && (
        <div className="grid gap-1.5">
          <Label htmlFor="meta-status">Situação</Label>
          <NativeSelect id="meta-status" value={status} onChange={(e) => setStatus(e.target.value as StatusMeta)}>
            {(Object.keys(STATUS_META) as StatusMeta[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      <Erro>{erro}</Erro>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending || criarMarcos.isPending}>
          {(salvar.isPending || criarMarcos.isPending) && <LoaderCircleIcon className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DialogMeta({
  aberto,
  ...props
}: {
  aberto: boolean
  meta: MetaSituacao | null
  objetivoInicial?: string
  ano: number
  onFechar: () => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && props.onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{aberto && <FormMeta {...props} />}</DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Registro de progresso (metas numéricas manuais)
// -----------------------------------------------------------------------------

function FormProgresso({ meta, onFechar }: { meta: MetaSituacao; onFechar: () => void }) {
  const historico = useProgressoMeta(meta.id)
  const registrar = useRegistrarProgresso()
  const excluir = useExcluirProgresso()
  const [valor, setValor] = useState('1')
  const [data, setData] = useState(hojeSP())
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = lerNumero(valor)
    if (n === null || !Number.isFinite(n) || n === 0) return setErro('Informe quanto avançou (use negativo para corrigir).')
    if (!data) return setErro('Informe a data.')
    try {
      await registrar.mutateAsync({ meta_id: meta.id, valor: n, registrado_em: data, observacao: observacao.trim() || null })
      toast.success('Progresso registrado.')
      setValor('1')
      setObservacao('')
      setErro('')
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{meta.titulo}</DialogTitle>
        <DialogDescription>
          Agora: {formatarQuantidade(meta.valor)} de {formatarQuantidade(meta.alvo)} {meta.unidade ?? ''}. Cada registro soma ao total.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={enviar} className="grid gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="prog-valor">Quanto avançou{meta.unidade ? ` (${meta.unidade})` : ''}</Label>
            <Input id="prog-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="prog-data">Data</Label>
            <Input id="prog-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prog-obs">Observação (opcional)</Label>
          <Input id="prog-obs" maxLength={2000} placeholder="Ex.: terminei “O Peregrino”" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
        <Erro>{erro}</Erro>
        <Button type="submit" disabled={registrar.isPending}>
          {registrar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
          Registrar
        </Button>
      </form>

      <div className="grid gap-1">
        <p className="text-sm font-medium">Histórico</p>
        {historico.data?.length ? (
          <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border text-sm">
            {historico.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="text-muted-foreground w-20 shrink-0 text-xs tabular-nums">{formatarData(p.registrado_em)}</span>
                <span className="w-14 shrink-0 font-medium tabular-nums">
                  {p.valor > 0 ? '+' : ''}
                  {formatarQuantidade(p.valor)}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate">{p.observacao}</span>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Excluir registro" onClick={() => excluir.mutate(p.id)}>
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Fechar
        </Button>
      </DialogFooter>
    </div>
  )
}

export function DialogProgresso({ meta, onFechar }: { meta: MetaSituacao | null; onFechar: () => void }) {
  return (
    <Dialog open={Boolean(meta)} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{meta && <FormProgresso meta={meta} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Áreas da vida
// -----------------------------------------------------------------------------

function FormArea({ area, quantidade, onFim }: { area: AreaVida | null; quantidade: number; onFim: () => void }) {
  const salvar = useSalvarArea()
  const [nome, setNome] = useState(area?.nome ?? '')
  const [cor, setCor] = useState(area?.cor ?? proximaCor(quantidade))
  const [icone, setIcone] = useState(area?.icone ?? 'estrela')
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Dê um nome à área.')
    try {
      await salvar.mutateAsync({ id: area?.id, dados: { nome: nome.trim(), cor, icone, ...(area ? {} : { ordem: quantidade + 1 }) } })
      toast.success(area ? 'Área atualizada.' : 'Área criada.')
      onFim()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="bg-muted/40 grid gap-3 rounded-lg border p-3" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="area-nome">Nome</Label>
        <Input id="area-nome" maxLength={40} placeholder="Ex.: Ministério, Viagens" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Cor</span>
        <SeletorCor value={cor} onChange={setCor} />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Ícone</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone">
          {Object.entries(ICONES_AREA).map(([chave, { icone: Icone, rotulo }]) => (
            <button
              key={chave}
              type="button"
              role="radio"
              aria-checked={icone === chave}
              aria-label={rotulo}
              title={rotulo}
              onClick={() => setIcone(chave)}
              className={cn('flex size-9 items-center justify-center rounded-md border', icone === chave ? 'border-foreground bg-accent' : 'hover:bg-accent')}
            >
              <Icone className="size-4" />
            </button>
          ))}
        </div>
      </div>
      <Erro>{erro}</Erro>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onFim}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={salvar.isPending}>
          Salvar área
        </Button>
      </div>
    </form>
  )
}

export function DialogAreas({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const areas = useAreas()
  const excluir = useExcluirArea()
  const [editando, setEditando] = useState<AreaVida | 'nova' | null>(null)
  const lista = areas.data ?? []

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          setEditando(null)
          onFechar()
        }
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Áreas da vida</DialogTitle>
          <DialogDescription>Organizam objetivos, hábitos e tarefas. Crie as suas além das padrão.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {lista.map((a) =>
            editando !== 'nova' && editando?.id === a.id ? (
              <li key={a.id} className="p-2">
                <FormArea area={a} quantidade={lista.length} onFim={() => setEditando(null)} />
              </li>
            ) : (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <IconeArea area={a} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.nome}</span>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${a.nome}`} onClick={() => setEditando(a)}>
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Excluir ${a.nome}`}
                  onClick={() => excluir.mutate(a.id, { onSuccess: () => toast.success('Área excluída.') })}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ),
          )}
        </ul>
        {editando === 'nova' ? (
          <FormArea area={null} quantidade={lista.length} onFim={() => setEditando(null)} />
        ) : (
          <Button variant="outline" onClick={() => setEditando('nova')}>
            <PlusIcon />
            Nova área
          </Button>
        )}
        <p className="text-muted-foreground text-xs">Uma área com objetivos não pode ser excluída: mova ou apague os objetivos antes.</p>
      </DialogContent>
    </Dialog>
  )
}
