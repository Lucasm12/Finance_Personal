import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CampoMoeda } from '@/components/CampoMoeda'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useSalvarConta } from '@/hooks/useDados'
import {
  NOMES_MESES,
  competenciaAtual,
  competenciaDe,
  competenciaMedia,
  nomeCompetencia,
  parcelaNoMes,
  partesCompetencia,
  somarMeses,
} from '@/lib/format'
import { ROTAS_FINANCEIRO } from '@/modulos'
import type { Categoria, Competencia, Conta, ContaInput } from '@/types'

interface Formulario {
  nome: string
  categoria_id: string
  valor_padrao: number
  dia_vencimento: string
  codigo_pagamento: string
  responsavel: string
  parcelado: boolean
  parcela_atual: string
  total_parcelas: string
  parcela_referencia: Competencia
  ativa: boolean
  observacao: string
}

function formularioInicial(conta: Conta | null, categoriaPadrao: string): Formulario {
  const mes = competenciaAtual()
  if (!conta) {
    return {
      nome: '',
      categoria_id: categoriaPadrao,
      valor_padrao: 0,
      dia_vencimento: '',
      codigo_pagamento: '',
      responsavel: '',
      parcelado: false,
      parcela_atual: '1',
      total_parcelas: '',
      parcela_referencia: mes,
      ativa: true,
      observacao: '',
    }
  }

  // Mostra a parcela já "andada" para o mês atual, se o parcelamento estiver em curso.
  let parcelaAtual = conta.parcela_atual
  let referencia = conta.parcela_referencia ?? mes
  const noMes = parcelaNoMes(conta, mes)
  if (noMes !== null && noMes >= 1 && noMes <= conta.total_parcelas!) {
    parcelaAtual = noMes
    referencia = mes
  }

  return {
    nome: conta.nome,
    categoria_id: conta.categoria_id,
    valor_padrao: conta.valor_padrao,
    dia_vencimento: conta.dia_vencimento?.toString() ?? '',
    codigo_pagamento: conta.codigo_pagamento ?? '',
    responsavel: conta.responsavel ?? '',
    parcelado: conta.total_parcelas !== null,
    parcela_atual: parcelaAtual?.toString() ?? '1',
    total_parcelas: conta.total_parcelas?.toString() ?? '',
    parcela_referencia: referencia,
    ativa: conta.ativa,
    observacao: conta.observacao ?? '',
  }
}

type Erros = Partial<Record<keyof Formulario, string>>

function validar(f: Formulario): Erros {
  const erros: Erros = {}
  if (!f.nome.trim()) erros.nome = 'Informe o nome da conta.'
  if (!f.categoria_id) erros.categoria_id = 'Escolha a categoria.'
  if (f.dia_vencimento) {
    const dia = Number(f.dia_vencimento)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) erros.dia_vencimento = 'Dia entre 1 e 31.'
  }
  if (f.parcelado) {
    const atual = Number(f.parcela_atual)
    const total = Number(f.total_parcelas)
    if (!Number.isInteger(total) || total < 1) erros.total_parcelas = 'Informe o total de parcelas.'
    if (!Number.isInteger(atual) || atual < 1) erros.parcela_atual = 'Parcela inválida.'
    else if (Number.isInteger(total) && atual > total) erros.parcela_atual = 'Maior que o total.'
  }
  return erros
}

function paraBanco(f: Formulario): ContaInput {
  return {
    nome: f.nome.trim(),
    categoria_id: f.categoria_id,
    valor_padrao: f.valor_padrao,
    dia_vencimento: f.dia_vencimento ? Number(f.dia_vencimento) : null,
    codigo_pagamento: f.codigo_pagamento.trim() || null,
    responsavel: f.responsavel.trim() || null,
    parcela_atual: f.parcelado ? Number(f.parcela_atual) : null,
    total_parcelas: f.parcelado ? Number(f.total_parcelas) : null,
    parcela_referencia: f.parcelado ? f.parcela_referencia : null,
    ativa: f.ativa,
    observacao: f.observacao.trim() || null,
  }
}

function Erro({ children }: { children?: string }) {
  return children ? <p className="text-destructive text-xs">{children}</p> : null
}

interface FormProps {
  conta: Conta | null
  categorias: Categoria[]
  responsaveis: string[]
  categoriaPadrao: string
  onFechar: () => void
}

function FormConta({ conta, categorias, responsaveis, categoriaPadrao, onFechar }: FormProps) {
  const salvar = useSalvarConta()
  const [f, setF] = useState(() => formularioInicial(conta, categoriaPadrao))
  const [erros, setErros] = useState<Erros>({})
  const [aplicarEmAberto, setAplicarEmAberto] = useState(false)
  const [lancarNoMes, setLancarNoMes] = useState(true)
  const mesAtual = competenciaAtual()

  const set = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setF((atual) => ({ ...atual, [campo]: valor }))

  const valorMudou = conta !== null && Math.abs(conta.valor_padrao - f.valor_padrao) >= 0.005
  const total = Number(f.total_parcelas)
  const atual = Number(f.parcela_atual)
  const previsaoFim =
    f.parcelado && total >= 1 && atual >= 1 && atual <= total
      ? somarMeses(f.parcela_referencia, total - atual)
      : null

  const ref = partesCompetencia(f.parcela_referencia)
  const anos = Array.from({ length: 11 }, (_, i) => partesCompetencia(mesAtual).ano - 5 + i)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const encontrados = validar(f)
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    try {
      await salvar.mutateAsync({
        id: conta?.id,
        dados: paraBanco(f),
        aplicarEmAberto: valorMudou && aplicarEmAberto,
        lancarNoMesAtual: !conta && lancarNoMes,
      })
      toast.success(conta ? 'Conta atualizada.' : 'Conta cadastrada.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{conta ? 'Editar conta' : 'Nova conta'}</DialogTitle>
        <DialogDescription>Modelo que se repete todo mês. O valor pode ser ajustado mês a mês no painel.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={f.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Ex.: Energia, Medplan Lucas"
          aria-invalid={!!erros.nome}
          autoFocus={!conta}
        />
        <Erro>{erros.nome}</Erro>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <NativeSelect
            id="categoria"
            value={f.categoria_id}
            onChange={(e) => set('categoria_id', e.target.value)}
            aria-invalid={!!erros.categoria_id}
          >
            <option value="" disabled>
              Escolha…
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
          <Erro>{erros.categoria_id}</Erro>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="valor">Valor padrão</Label>
          <CampoMoeda id="valor" value={f.valor_padrao} onChange={(v) => set('valor_padrao', v)} />
        </div>
      </div>

      {valorMudou && (
        <label className="bg-muted/50 flex items-start gap-2 rounded-md p-3 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={aplicarEmAberto}
            onCheckedChange={(v) => setAplicarEmAberto(v === true)}
          />
          <span>
            Aplicar o novo valor também aos lançamentos <strong>não pagos</strong> a partir de{' '}
            {nomeCompetencia(mesAtual)}.
          </span>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dia">Dia do vencimento (opcional)</Label>
          <Input
            id="dia"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            placeholder="1 a 31"
            value={f.dia_vencimento}
            onChange={(e) => set('dia_vencimento', e.target.value)}
            aria-invalid={!!erros.dia_vencimento}
          />
          <Erro>{erros.dia_vencimento}</Erro>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="responsavel">Responsável (opcional)</Label>
          <Input
            id="responsavel"
            list="lista-responsaveis"
            placeholder="Ex.: Lucas, Débora"
            value={f.responsavel}
            onChange={(e) => set('responsavel', e.target.value)}
          />
          <datalist id="lista-responsaveis">
            {responsaveis.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="codigo">Código de pagamento (opcional)</Label>
        <Textarea
          id="codigo"
          rows={2}
          className="font-mono text-xs md:text-xs"
          placeholder="Linha digitável do boleto, chave/código PIX ou nº do contrato"
          value={f.codigo_pagamento}
          onChange={(e) => set('codigo_pagamento', e.target.value)}
        />
      </div>

      <div className="grid gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="parcelado" className="cursor-pointer">
            Conta parcelada
          </Label>
          <Switch id="parcelado" checked={f.parcelado} onCheckedChange={(v) => set('parcelado', v)} />
        </div>

        {f.parcelado && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="parcela-atual" className="text-xs">
                  Parcela atual
                </Label>
                <Input
                  id="parcela-atual"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={f.parcela_atual}
                  onChange={(e) => set('parcela_atual', e.target.value)}
                  aria-invalid={!!erros.parcela_atual}
                />
                <Erro>{erros.parcela_atual}</Erro>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total-parcelas" className="text-xs">
                  Total de parcelas
                </Label>
                <Input
                  id="total-parcelas"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={f.total_parcelas}
                  onChange={(e) => set('total_parcelas', e.target.value)}
                  aria-invalid={!!erros.total_parcelas}
                />
                <Erro>{erros.total_parcelas}</Erro>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">A parcela atual é a do mês</Label>
              <div className="grid grid-cols-[1fr_7rem] gap-2">
                <NativeSelect
                  aria-label="Mês da parcela atual"
                  value={ref.mes}
                  onChange={(e) => set('parcela_referencia', competenciaDe(ref.ano, Number(e.target.value)))}
                >
                  {NOMES_MESES.map((nome, i) => (
                    <option key={nome} value={i + 1}>
                      {nome}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Ano da parcela atual"
                  value={ref.ano}
                  onChange={(e) => set('parcela_referencia', competenciaDe(Number(e.target.value), ref.mes))}
                >
                  {anos.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            {previsaoFim && (
              <p className="text-muted-foreground text-xs">
                Última parcela em <strong className="text-foreground">{competenciaMedia(previsaoFim)}</strong>. Depois
                disso a conta deixa de ser lançada e é encerrada automaticamente.
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea
          id="observacao"
          rows={2}
          value={f.observacao}
          onChange={(e) => set('observacao', e.target.value)}
        />
      </div>

      {conta ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="ativa" className="cursor-pointer">
            Conta ativa <span className="text-muted-foreground font-normal">(gera lançamentos)</span>
          </Label>
          <Switch id="ativa" checked={f.ativa} onCheckedChange={(v) => set('ativa', v)} />
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={lancarNoMes} onCheckedChange={(v) => setLancarNoMes(v === true)} />
          Lançar já em {nomeCompetencia(mesAtual)}
        </label>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  aberto: boolean
  conta: Conta | null
  categorias: Categoria[]
  responsaveis: string[]
  categoriaPadrao?: string
  onFechar: () => void
}

export function DialogConta({ aberto, conta, categorias, responsaveis, categoriaPadrao, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-xl">
        {categorias.length === 0 ? (
          <DialogHeader>
            <DialogTitle>Crie uma categoria primeiro</DialogTitle>
            <DialogDescription>
              Toda conta pertence a uma categoria.{' '}
              <Link to={ROTAS_FINANCEIRO.categorias} className="text-primary underline">
                Ir para Categorias
              </Link>
            </DialogDescription>
          </DialogHeader>
        ) : (
          aberto && (
            <FormConta
              key={conta?.id ?? 'nova'}
              conta={conta}
              categorias={categorias}
              responsaveis={responsaveis}
              categoriaPadrao={categoriaPadrao ?? categorias[0].id}
              onFechar={onFechar}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
