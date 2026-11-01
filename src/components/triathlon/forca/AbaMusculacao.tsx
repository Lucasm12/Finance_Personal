import { useMemo, useState } from 'react'
import { CalendarPlusIcon, LoaderCircleIcon, PencilIcon, RefreshCwIcon, SparklesIcon, WandIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogAgendarRotina } from '@/components/triathlon/forca/DialogAgendarRotina'
import { PainelForca } from '@/components/triathlon/forca/PainelForca'
import { CardRotinaConteudo, CONFIG_PADRAO, ConfigRotina } from '@/components/triathlon/forca/Rotina'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useRotinaAtiva, useSalvarRotina, useSeriesForca, useTreinosPlanejados, useTreinosRecentes } from '@/hooks/useTriathlon'
import { mensagemErro } from '@/lib/erros'
import { contextoAerobico, modeloFullBody3, NOMES_DIA, ombrosCarregados, pernasCarregadas, sugerirRotina } from '@/lib/forca/recomendacao'
import { dataLocal, inicioSemana, somarDias } from '@/lib/triathlon'
import type { ConfigForca, RotinaForca, RotinaForcaInput } from '@/types/triathlon'

type Modo =
  | { tipo: 'ver' }
  | { tipo: 'configurar' }
  | { tipo: 'rascunho'; rotina: RotinaForcaInput; motivos: string[]; avisos: string[]; id?: string }

const configDa = (r: RotinaForca): ConfigForca => ({
  objetivo: r.objetivo,
  objetivo_secundario: r.objetivo_secundario,
  nivel: r.nivel,
  local: r.local,
  frequencia: r.frequencia,
  foco: r.foco,
  duracao_min: r.duracao_min,
  equipamentos: r.equipamentos,
})

export function AbaMusculacao() {
  const hoje = dataLocal(new Date())
  const semana = inicioSemana(hoje)
  const rotina = useRotinaAtiva()
  const treinos = useTreinosRecentes()
  const series = useSeriesForca(somarDias(hoje, -180), hoje)
  const planejados = useTreinosPlanejados(somarDias(semana, -56), somarDias(semana, 62))
  const salvar = useSalvarRotina()
  const ctx = useMemo(() => contextoAerobico(treinos.data ?? [], hoje), [treinos.data, hoje])

  const [modo, setModo] = useState<Modo>({ tipo: 'ver' })
  const [config, setConfig] = useState<ConfigForca>(CONFIG_PADRAO)
  const [agendando, setAgendando] = useState(false)

  const erro = rotina.error ?? series.error
  if (erro) {
    return (
      <Card className="items-center gap-2 px-6 py-10 text-center">
        <p className="font-medium">Não foi possível carregar a musculação</p>
        <p className="text-muted-foreground max-w-lg text-sm">{mensagemErro(erro)}</p>
      </Card>
    )
  }
  if (rotina.isLoading || series.isLoading) return <Skeleton className="h-96 rounded-xl" />

  const ativa = rotina.data ?? null
  const configurando = modo.tipo === 'configurar' || (!ativa && modo.tipo === 'ver')

  function gerar() {
    const s = sugerirRotina(config, ctx, series.data ?? [], hoje)
    setModo({ tipo: 'rascunho', rotina: s.rotina, motivos: s.motivos, avisos: s.avisos })
  }

  function usarModelo() {
    setModo({
      tipo: 'rascunho',
      rotina: modeloFullBody3(config),
      motivos: ['Rotina Full Body de 3 dias de referência: A força geral, B hipertrofia, C volume e condicionamento. Ajuste séries, repetições e exercícios como quiser.'],
      avisos: [],
    })
  }

  async function salvarRascunho(r: RotinaForcaInput, id?: string) {
    if (!r.nome.trim()) return toast.error('Dê um nome para a rotina.')
    const vazio = r.treinos.find((t) => !t.exercicios.length)
    if (vazio) return toast.error(`O treino ${vazio.letra} está sem exercícios.`)
    const semNome = r.treinos.find((t) => t.exercicios.some((x) => !x.nome.trim()))
    if (semNome) return toast.error(`Há exercício sem nome no treino ${semNome.letra}.`)
    try {
      await salvar.mutateAsync({ id, dados: { ...r, nome: r.nome.trim() } })
      toast.success(id ? 'Rotina atualizada.' : 'Rotina salva. Agora coloque os treinos na agenda.')
      setModo({ tipo: 'ver' })
      if (!id) setAgendando(true)
    } catch {
      // erro já exibido pelo hook
    }
  }

  // próximo treino da sequência: depois do último agendado desta rotina
  const daRotina = (planejados.data ?? []).filter((t) => ativa && t.rotina_id === ativa.id && t.rotina_treino).sort((a, b) => b.data.localeCompare(a.data))
  const ultimaLetra = daRotina[0]?.rotina_treino
  const proximo = ativa && ultimaLetra ? ativa.treinos.findIndex((t) => t.letra === ultimaLetra) + 1 : 0

  return (
    <div className="grid gap-4 sm:gap-5">
      <Card className="gap-1 px-4 py-3 sm:px-5">
        <div className="text-sm font-medium">O que a sugestão leva em conta do seu aeróbico</div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Média das últimas 4 semanas em Treinos: corrida {Math.round(ctx.corridaKm)} km, pedal {Math.round(ctx.pedalKm)} km e natação{' '}
          {Math.round(ctx.natacaoM).toLocaleString('pt-BR')} m por semana
          {ctx.diaLongao ? `; treino longo costuma ser na ${NOMES_DIA[ctx.diaLongao]}` : ''}.
          {pernasCarregadas(ctx) && ' Pernas já bem exigidas: menos volume pesado de pernas e nada de impacto.'}
          {ombrosCarregados(ctx) && ' Muito nado: mais cuidado com ombros.'}
        </p>
      </Card>

      {configurando && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{ativa ? 'Nova rotina' : 'Monte sua rotina de musculação'}</CardTitle>
            <CardDescription>
              Diga o objetivo e quanto tempo tem. A sugestão respeita seu nível, o tempo por sessão, o equipamento, o histórico de cargas e o que você já faz de
              corrida, pedal e natação. Tudo pode ser editado antes de salvar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <ConfigRotina config={config} onChange={setConfig} />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button onClick={gerar}>
                <WandIcon />
                Gerar sugestão
              </Button>
              <Button variant="outline" onClick={usarModelo}>
                <SparklesIcon />
                Usar modelo Full Body 3 dias
              </Button>
              {ativa && (
                <Button variant="ghost" onClick={() => setModo({ tipo: 'ver' })}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {modo.tipo === 'rascunho' && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{modo.id ? 'Editando a rotina' : 'Sugestão de rotina'}</CardTitle>
            <CardDescription>Revise e ajuste: troque exercícios por alternativas, mude séries, repetições, descanso e dias.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid max-w-md gap-1.5">
              <label htmlFor="rotina-nome" className="text-xs font-medium">
                Nome da rotina
              </label>
              <Input id="rotina-nome" value={modo.rotina.nome} onChange={(e) => setModo({ ...modo, rotina: { ...modo.rotina, nome: e.target.value } })} />
            </div>
            <CardRotinaConteudo
              rotina={modo.rotina}
              onChange={(r) => setModo({ ...modo, rotina: r })}
              motivos={modo.motivos}
              avisos={modo.avisos}
              acoes={
                <>
                  <Button onClick={() => salvarRascunho(modo.rotina, modo.id)} disabled={salvar.isPending}>
                    {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
                    {modo.id ? 'Salvar alterações' : 'Salvar rotina'}
                  </Button>
                  {!modo.id && (
                    <Button variant="outline" onClick={gerar}>
                      <RefreshCwIcon />
                      Gerar de novo
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setModo(modo.id ? { tipo: 'ver' } : { tipo: 'configurar' })}>
                    Voltar
                  </Button>
                </>
              }
            />
            {!modo.id && ativa && <p className="text-muted-foreground text-xs">Ao salvar, esta passa a ser a rotina ativa; a atual fica guardada e os treinos já agendados não mudam.</p>}
          </CardContent>
        </Card>
      )}

      {modo.tipo === 'ver' && ativa && (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{ativa.nome}</CardTitle>
            <CardDescription>Sua rotina ativa. Toque num exercício para ver como executar.</CardDescription>
          </CardHeader>
          <CardContent>
            <CardRotinaConteudo
              rotina={ativa}
              acoes={
                <>
                  <Button onClick={() => setAgendando(true)}>
                    <CalendarPlusIcon />
                    Colocar na agenda
                  </Button>
                  <Button variant="outline" onClick={() => setModo({ tipo: 'rascunho', rotina: ativa, motivos: [], avisos: [], id: ativa.id })}>
                    <PencilIcon />
                    Editar rotina
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setConfig(configDa(ativa))
                      setModo({ tipo: 'configurar' })
                    }}
                  >
                    <WandIcon />
                    Nova rotina
                  </Button>
                </>
              }
            />
          </CardContent>
        </Card>
      )}

      <PainelForca series={series.data ?? []} planejados={planejados.data ?? []} rotina={ativa} />

      {ativa && <DialogAgendarRotina aberto={agendando} rotina={ativa} ctx={ctx} proximo={proximo} onFechar={() => setAgendando(false)} />}
    </div>
  )
}
