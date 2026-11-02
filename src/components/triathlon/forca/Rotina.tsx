import { useState, type ReactNode } from 'react'
import { ClockIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'

import { EditorExercicios, ListaExercicios } from '@/components/triathlon/forca/Exercicios'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NOMES_EQUIPAMENTO, NOMES_NIVEL } from '@/lib/forca/exercicios'
import { duracaoEstimada, SIGLAS_DIA } from '@/lib/forca/recomendacao'
import { cn } from '@/lib/utils'
import type { ConfigForca, Equipamento, FocoForca, LocalForca, NivelForca, ObjetivoForca, ObjetivoSecundario, RotinaForcaInput } from '@/types/triathlon'

export const OBJETIVOS: Record<ObjetivoForca, string> = {
  emagrecimento: 'Emagrecimento',
  hipertrofia: 'Hipertrofia',
  recomposicao: 'Recomposição corporal',
}
export const OBJETIVOS_SECUNDARIOS: Record<ObjetivoSecundario, string> = {
  endurance: 'Desempenho no triathlon',
  saude: 'Saúde e prevenção de lesões',
}
export const FOCOS: Record<FocoForca, string> = {
  corpo_inteiro: 'Corpo inteiro',
  superiores: 'Membros superiores',
  inferiores: 'Membros inferiores',
  forca_condicionamento: 'Força e condicionamento',
}
export const LOCAIS: Record<LocalForca, string> = { academia: 'Academia', casa: 'Em casa' }

/** Botões de escolha única no padrão do app. */
export function Escolha<T extends string | number>({
  valor,
  opcoes,
  onChange,
  rotulo,
  colunas,
}: {
  valor: T
  opcoes: [T, string][]
  onChange: (v: T) => void
  rotulo: string
  colunas?: number
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium">{rotulo}</span>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${colunas ?? opcoes.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={rotulo}
      >
        {opcoes.map(([v, texto]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={valor === v}
            onClick={() => onChange(v)}
            className={cn(
              'rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
              valor === v ? 'bg-primary text-primary-foreground border-transparent' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  )
}

export const CONFIG_PADRAO: ConfigForca = {
  objetivo: 'recomposicao',
  objetivo_secundario: 'endurance',
  nivel: 'intermediario',
  local: 'academia',
  frequencia: 3,
  foco: 'corpo_inteiro',
  duracao_min: 60,
  equipamentos: [],
}

/** Formulário dos parâmetros da rotina. */
export function ConfigRotina({ config, onChange }: { config: ConfigForca; onChange: (c: ConfigForca) => void }) {
  const set = <K extends keyof ConfigForca>(k: K) => (v: ConfigForca[K]) => onChange({ ...config, [k]: v })
  const equipamentos = Object.keys(NOMES_EQUIPAMENTO) as Equipamento[]
  return (
    <div className="grid gap-4">
      <Escolha rotulo="Objetivo principal" valor={config.objetivo} onChange={set('objetivo')} opcoes={Object.entries(OBJETIVOS) as [ObjetivoForca, string][]} colunas={3} />
      <Escolha
        rotulo="Objetivo secundário"
        valor={config.objetivo_secundario ?? 'nenhum'}
        onChange={(v) => set('objetivo_secundario')(v === 'nenhum' ? null : (v as ObjetivoSecundario))}
        opcoes={[['nenhum', 'Nenhum'], ...(Object.entries(OBJETIVOS_SECUNDARIOS) as [string, string][])]}
        colunas={3}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Escolha rotulo="Nível" valor={config.nivel} onChange={set('nivel')} opcoes={Object.entries(NOMES_NIVEL) as [NivelForca, string][]} />
        <Escolha rotulo="Onde vai treinar" valor={config.local} onChange={set('local')} opcoes={Object.entries(LOCAIS) as [LocalForca, string][]} />
      </div>
      <Escolha rotulo="Dias por semana" valor={config.frequencia} onChange={set('frequencia')} opcoes={[2, 3, 4, 5, 6].map((n) => [n, `${n}`] as [number, string])} />
      <Escolha rotulo="Foco muscular" valor={config.foco} onChange={set('foco')} opcoes={Object.entries(FOCOS) as [FocoForca, string][]} colunas={2} />
      <Escolha
        rotulo="Tempo por sessão"
        valor={config.duracao_min}
        onChange={set('duracao_min')}
        opcoes={([30, 45, 60, 90] as const).map((n) => [n, `${n} min`] as [ConfigForca['duracao_min'], string])}
      />
      {config.local === 'casa' && (
        <div className="grid gap-1.5">
          <span className="text-xs font-medium">Equipamentos que você tem (o peso do corpo sempre conta)</span>
          <div className="flex flex-wrap gap-1.5">
            {equipamentos
              .filter((e) => e !== 'maquinas' && e !== 'polia')
              .map((e) => {
                const ativo = config.equipamentos.includes(e)
                return (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => set('equipamentos')(ativo ? config.equipamentos.filter((x) => x !== e) : [...config.equipamentos, e])}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      ativo ? 'bg-primary text-primary-foreground border-transparent' : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {NOMES_EQUIPAMENTO[e]}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

export function Lista({ itens, icone: Icone, classe }: { itens: string[]; icone: typeof InfoIcon; classe: string }) {
  if (!itens.length) return null
  return (
    <ul className="grid gap-1.5">
      {itens.map((t) => (
        <li key={t} className="flex gap-2 text-xs leading-relaxed">
          <Icone className={cn('mt-0.5 size-3.5 shrink-0', classe)} aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

interface PropsCard {
  rotina: RotinaForcaInput
  /** com onChange a rotina fica editável */
  onChange?: (r: RotinaForcaInput) => void
  motivos?: string[]
  avisos?: string[]
  acoes?: ReactNode
}

/** A rotina com os treinos de cada dia. */
export function CardRotinaConteudo({ rotina, onChange, motivos = [], avisos = [], acoes }: PropsCard) {
  const [aba, setAba] = useState(0)
  const treino = rotina.treinos[Math.min(aba, rotina.treinos.length - 1)]
  const editavel = !!onChange
  const mudarTreino = (m: Partial<typeof treino>) =>
    onChange?.({ ...rotina, treinos: rotina.treinos.map((t, i) => (i === aba ? { ...t, ...m } : t)) })

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {[
          OBJETIVOS[rotina.objetivo],
          rotina.objetivo_secundario ? OBJETIVOS_SECUNDARIOS[rotina.objetivo_secundario] : null,
          NOMES_NIVEL[rotina.nivel],
          LOCAIS[rotina.local],
          `${rotina.frequencia}×/semana`,
          FOCOS[rotina.foco],
          `${rotina.duracao_min} min`,
        ]
          .filter(Boolean)
          .map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
      </div>

      {(motivos.length > 0 || avisos.length > 0) && (
        <div className="grid gap-2 rounded-lg border p-3">
          <Lista itens={motivos} icone={InfoIcon} classe="text-primary" />
          <Lista itens={avisos} icone={TriangleAlertIcon} classe="text-amber-600" />
        </div>
      )}

      <div className="grid gap-1.5">
        <span className="text-xs font-medium">Dias sugeridos</span>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const i = rotina.dias_semana.indexOf(d)
            const ativo = i >= 0
            return (
              <button
                key={d}
                type="button"
                disabled={!editavel}
                aria-pressed={ativo}
                onClick={() =>
                  onChange?.({ ...rotina, dias_semana: ativo ? rotina.dias_semana.filter((x) => x !== d) : [...rotina.dias_semana, d].sort((a, b) => a - b) })
                }
                className={cn(
                  'flex min-w-12 flex-col items-center rounded-lg border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default',
                  ativo ? 'bg-primary/10 border-primary/40' : 'text-muted-foreground',
                  editavel && !ativo && 'hover:bg-accent',
                )}
              >
                {SIGLAS_DIA[d]}
                <span className="text-[10px] font-semibold">{ativo ? (rotina.treinos[[...rotina.dias_semana].sort((a, b) => a - b).indexOf(d) % rotina.treinos.length]?.letra ?? '') : ' '}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Treinos da rotina">
        {rotina.treinos.map((t, i) => (
          <button
            key={t.letra}
            type="button"
            role="tab"
            aria-selected={i === aba}
            onClick={() => setAba(i)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-left text-sm transition-colors',
              i === aba ? 'bg-foreground text-background border-transparent' : 'hover:bg-accent',
            )}
          >
            <span className="font-semibold">Treino {t.letra}</span>
            <span className={cn('block text-xs', i === aba ? 'opacity-80' : 'text-muted-foreground')}>{t.nome}</span>
          </button>
        ))}
      </div>

      {treino && (
        <div className="grid gap-3" role="tabpanel">
          {editavel ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="treino-nome" className="text-xs">
                  Nome do treino {treino.letra}
                </Label>
                <Input id="treino-nome" value={treino.nome} onChange={(e) => mudarTreino({ nome: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="treino-foco" className="text-xs">
                  Foco
                </Label>
                <Input id="treino-foco" value={treino.foco} onChange={(e) => mudarTreino({ foco: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">{treino.foco}</div>
          )}
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <ClockIcon className="size-3.5" aria-hidden />~{duracaoEstimada(treino.exercicios)} min com aquecimento · {treino.exercicios.reduce((s, x) => s + x.series, 0)} séries
          </div>
          {editavel ? (
            <EditorExercicios
              exercicios={treino.exercicios}
              onChange={(exercicios) => mudarTreino({ exercicios })}
              local={rotina.local}
              equipamentos={rotina.equipamentos}
              nivel={rotina.nivel}
            />
          ) : (
            <ListaExercicios exercicios={treino.exercicios} />
          )}
        </div>
      )}
      {acoes && <div className="flex flex-wrap gap-2 border-t pt-4">{acoes}</div>}
    </div>
  )
}
