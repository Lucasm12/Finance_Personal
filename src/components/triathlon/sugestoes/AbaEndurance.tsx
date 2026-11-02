import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlusIcon, ChevronDownIcon, ChevronUpIcon, CloudDownloadIcon, InfoIcon, LoaderCircleIcon, ScaleIcon, SparklesIcon, StarIcon, Trash2Icon, TriangleAlertIcon, WandIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogTreino } from '@/components/triathlon/DialogTreino'
import { Escolha, Lista } from '@/components/triathlon/forca/Rotina'
import { IconeModalidade } from '@/components/triathlon/LinhaTreino'
import { SeletorModalidade } from '@/components/triathlon/SeletorModalidade'
import { CardSugestao } from '@/components/triathlon/sugestoes/CardSugestao'
import { DialogAgendarSugestao, type PedidoAgendamento } from '@/components/triathlon/sugestoes/DialogAgendarSugestao'
import { VisaoEstrutura } from '@/components/triathlon/sugestoes/VisaoEstrutura'
import { SeloStatus } from '@/components/triathlon/agenda/ItemPlanejado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStatusAiEndurance, useTreinosAiEndurance } from '@/hooks/useAiEndurance'
import { useExcluirSugestao, useSalvarSugestao, useSugestoesSalvas } from '@/hooks/useSugestoes'
import { usePerfilAtleta, useTreinosPlanejados, useTreinosRecentes } from '@/hooks/useTriathlon'
import { statusEfetivo } from '@/lib/agenda'
import { NOMES_NIVEL } from '@/lib/forca/exercicios'
import { OBJETIVOS_ENDURANCE, OBJETIVOS_POR_MODALIDADE } from '@/lib/sugestoes/catalogo'
import { totaisEstrutura } from '@/lib/sugestoes/estrutura'
import { CONFIG_ENDURANCE_PADRAO, contextoEndurance, sugerirTreinos, type ConfigEndurance, type ResultadoSugestao } from '@/lib/sugestoes/recomendacao'
import { temLimiar } from '@/lib/sugestoes/zonas'
import { dataLocal, duracaoCurta, formatarPace, MODALIDADES, MODALIDADES_TRI, somarDias } from '@/lib/triathlon'
import { ROTAS_TRIATHLON } from '@/modulos'
import type { EstruturaTreino, ModalidadeEndurance, NivelForca, ObjetivoEndurance, SugestaoSalva, Treino } from '@/types/triathlon'

const TEMPOS = [30, 45, 60, 90, 120]
const chave = (e: Pick<EstruturaTreino, 'fonte' | 'referencia' | 'nivel'>) => `${e.fonte}:${e.referencia ?? ''}:${e.nivel}`
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const haDias = (n: number | null) => (n === null ? 'nenhum nas últimas semanas' : n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`)

function ItemSalvo({ s, onAgendar, onExcluir }: { s: SugestaoSalva; onAgendar: () => void; onExcluir: () => void }) {
  const perfil = usePerfilAtleta()
  const [aberto, setAberto] = useState(false)
  return (
    <li className="grid gap-2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <IconeModalidade modalidade={s.modalidade} className="size-8" />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          <span className="flex items-center gap-1 font-medium">
            <span className="truncate">{s.nome}</span>
            {aberto ? <ChevronUpIcon className="size-4 shrink-0" /> : <ChevronDownIcon className="size-4 shrink-0" />}
          </span>
          <span className="text-muted-foreground block text-xs">
            {OBJETIVOS_ENDURANCE[s.objetivo]} · {NOMES_NIVEL[s.nivel]}
            {s.duracao_seg ? ` · ${duracaoCurta(s.duracao_seg)}` : ''}
            {s.fonte === 'ai_endurance' ? ' · AI Endurance' : ''}
          </span>
        </button>
        <Button size="sm" variant="outline" onClick={onAgendar}>
          <CalendarPlusIcon />
          <span className="hidden sm:inline">Agendar</span>
        </Button>
        <Button size="icon-sm" variant="ghost" className="text-muted-foreground" aria-label={`Excluir ${s.nome}`} onClick={onExcluir}>
          <Trash2Icon />
        </Button>
      </div>
      {aberto && <VisaoEstrutura estrutura={s.estrutura} perfil={perfil.data} />}
    </li>
  )
}

export function AbaEndurance() {
  const hoje = dataLocal(new Date())
  const perfil = usePerfilAtleta()
  const treinos = useTreinosRecentes()
  const salvas = useSugestoesSalvas()
  const salvar = useSalvarSugestao()
  const excluir = useExcluirSugestao()
  const status = useStatusAiEndurance()
  const [buscarAie, setBuscarAie] = useState(false)
  const aie = useTreinosAiEndurance(buscarAie)
  const planejados = useTreinosPlanejados(somarDias(hoje, -56), somarDias(hoje, 14))

  const [config, setConfig] = useState<ConfigEndurance>(CONFIG_ENDURANCE_PADRAO)
  const [resultado, setResultado] = useState<ResultadoSugestao | null>(null)
  const [pedido, setPedido] = useState<PedidoAgendamento | null>(null)
  const [comparar, setComparar] = useState<Treino | null>(null)
  const m = config.modalidade
  const ctx = useMemo(() => contextoEndurance(treinos.data ?? [], perfil.data, m, hoje), [treinos.data, perfil.data, m, hoje])
  const jaSalvas = useMemo(() => new Set((salvas.data ?? []).map((s) => chave(s))), [salvas.data])

  function mudar(c: Partial<ConfigEndurance>) {
    const novo = { ...config, ...c }
    if (novo.objetivo !== 'automatico' && !OBJETIVOS_POR_MODALIDADE[novo.modalidade].includes(novo.objetivo)) novo.objetivo = 'automatico'
    setConfig(novo)
    setResultado(null)
  }

  async function guardar(nome: string, estrutura: EstruturaTreino, descricao: string | null) {
    const t = totaisEstrutura(estrutura, perfil.data)
    try {
      await salvar.mutateAsync({
        modalidade: estrutura.modalidade,
        nome: nome.slice(0, 120),
        objetivo: estrutura.objetivo,
        nivel: estrutura.nivel,
        descricao: descricao?.slice(0, 2000) ?? null,
        fonte: estrutura.fonte,
        referencia: estrutura.referencia ?? null,
        duracao_seg: t.duracao_seg || null,
        distancia_m: t.distancia_m,
        estrutura,
      })
      toast.success('Treino salvo em “Meus treinos salvos”.')
    } catch {
      // erro já exibido pelo hook
    }
  }

  const agendarEstrutura = (nome: string, estrutura: EstruturaTreino, extra: Partial<PedidoAgendamento> = {}) => {
    const t = totaisEstrutura(estrutura, perfil.data)
    setPedido({ nome, estrutura, duracao_seg: t.duracao_seg || null, distancia_m: t.distancia_m, ...extra })
  }

  const limiar = (() => {
    const p = perfil.data
    if (m === 'corrida') return p?.pace_limiar_seg_km ? `pace de limiar ${formatarPace(p.pace_limiar_seg_km)} /km` : null
    if (m === 'ciclismo') return p?.ftp_w ? `FTP ${p.ftp_w} W` : null
    return p?.css_seg_100m ? `CSS ${formatarPace(p.css_seg_100m)} /100 m` : null
  })()
  const comEstrutura = (planejados.data ?? []).filter((t) => t.estrutura).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
  const aieOk = status.data?.configurado && status.data.vinculado

  return (
    <div className="grid gap-4 sm:gap-5">
      <Card className="gap-1 px-4 py-3 sm:px-5">
        <div className="text-sm font-medium">O que a sugestão leva em conta</div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {MODALIDADES[m].nome} nas últimas 4 semanas (em Treinos): {Math.round(ctx.semanal.sessoes * 10) / 10} treino(s) e{' '}
          {m === 'natacao' ? `${Math.round(ctx.semanal.distancia_m).toLocaleString('pt-BR')} m` : `${Math.round(ctx.semanal.distancia_m / 1000)} km`} por semana. Último
          treino intenso: {haDias(ctx.diasDesdeIntenso)}; último longo: {haDias(ctx.diasDesdeLongo)}. Forma de hoje: {ctx.forma ?? 'sem dados'}.{' '}
          {limiar ? `Alvos calculados pelo ${limiar}` : 'Sem limiar cadastrado: alvos por zona, FC e PSE'} (
          <Link to={ROTAS_TRIATHLON.perfil} className="text-primary font-medium hover:underline">
            Perfil do atleta
          </Link>
          ).
        </p>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Sugestões de corrida, pedal e natação</CardTitle>
          <CardDescription>
            Escolha a modalidade, o objetivo, o nível e o tempo que você tem. Cada treino vem com aquecimento, parte principal e desaquecimento, e a intensidade
            de cada bloco em zona, pace/potência, FC e percepção de esforço.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SeletorModalidade<ModalidadeEndurance> value={m} onChange={(modalidade) => mudar({ modalidade })} opcoes={MODALIDADES_TRI as ModalidadeEndurance[]} />
          <Escolha<ObjetivoEndurance | 'automatico'>
            rotulo="Objetivo"
            valor={config.objetivo}
            onChange={(objetivo) => mudar({ objetivo })}
            opcoes={[['automatico', 'Automático'], ...OBJETIVOS_POR_MODALIDADE[m].map((o): [ObjetivoEndurance, string] => [o, OBJETIVOS_ENDURANCE[o]])]}
            colunas={OBJETIVOS_POR_MODALIDADE[m].length + 1 > 4 ? 4 : OBJETIVOS_POR_MODALIDADE[m].length + 1}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Escolha<NivelForca> rotulo="Nível" valor={config.nivel} onChange={(nivel) => mudar({ nivel })} opcoes={Object.entries(NOMES_NIVEL) as [NivelForca, string][]} />
            <Escolha<number> rotulo="Tempo disponível" valor={config.tempo_min} onChange={(tempo_min) => mudar({ tempo_min })} opcoes={TEMPOS.map((t) => [t, t < 60 ? `${t} min` : `${Math.floor(t / 60)}h${t % 60 ? t % 60 : ''}`])} />
          </div>
          <div className="border-t pt-4">
            <Button onClick={() => setResultado(sugerirTreinos(config, ctx, perfil.data))}>
              <WandIcon />
              Gerar sugestões
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <div className="grid gap-3">
          {(resultado.motivos.length > 0 || resultado.avisos.length > 0) && (
            <div className="grid gap-2 rounded-lg border p-3">
              <Lista itens={resultado.motivos} icone={InfoIcon} classe="text-primary" />
              <Lista itens={resultado.avisos} icone={TriangleAlertIcon} classe="text-amber-600" />
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {resultado.sugestoes.map((s, i) => (
              <CardSugestao
                key={`${s.modelo.id}-${i}`}
                nome={s.modelo.nome}
                estrutura={s.estrutura}
                duracao_seg={s.duracao_seg}
                distancia_m={s.distancia_m}
                estimado={s.estimado}
                perfil={perfil.data}
                proposito={s.modelo.proposito}
                dica={s.modelo.dica}
                destaque={
                  <>
                    {s.recomendada && (
                      <Badge variant="sucesso">
                        <StarIcon />
                        Recomendado
                      </Badge>
                    )}
                    {s.ajustado && <Badge variant="alerta">encurtado para {config.tempo_min} min</Badge>}
                  </>
                }
                salvo={jaSalvas.has(chave(s.estrutura))}
                salvando={salvar.isPending}
                onSalvar={() => guardar(s.modelo.nome, s.estrutura, s.modelo.proposito)}
                onAgendar={() => agendarEstrutura(s.modelo.nome, s.estrutura)}
                onChange={(blocos) =>
                  setResultado((r) =>
                    r && {
                      ...r,
                      sugestoes: r.sugestoes.map((x, j) => (j === i ? { ...x, estrutura: { ...x.estrutura, blocos }, ...totaisEstrutura({ ...x.estrutura, blocos }, perfil.data) } : x)),
                    },
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="font-semibold">Meus treinos salvos</div>
          <span className="text-muted-foreground text-xs">{salvas.data?.length ?? 0}</span>
        </div>
        {salvas.data?.length ? (
          <ul className="divide-y border-t">
            {salvas.data.map((s) => (
              <ItemSalvo
                key={s.id}
                s={s}
                onAgendar={() => setPedido({ nome: s.nome, estrutura: s.estrutura, duracao_seg: s.duracao_seg, distancia_m: s.distancia_m, sugestao_id: s.id })}
                onExcluir={() => excluir.mutate(s.id, { onSuccess: () => toast.success('Treino salvo excluído. Os já agendados continuam na agenda.') })}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground border-t px-4 py-6 text-center text-sm">
            {salvas.isLoading ? 'Carregando…' : 'Nenhum treino salvo. Gere sugestões e toque em Salvar para montar sua biblioteca.'}
          </p>
        )}
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            Treinos do seu plano na AI Endurance
          </CardTitle>
          <CardDescription>Os treinos futuros que a AI Endurance montou para você, com os alvos dela (watts ou pace), prontos para salvar ou agendar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {status.isLoading ? (
            <p className="text-muted-foreground text-sm">Verificando a integração…</p>
          ) : !aieOk ? (
            <p className="text-muted-foreground text-sm">
              {status.error
                ? status.error.message
                : !status.data?.configurado
                  ? 'Integração não configurada: é preciso acesso de parceiro (Partner API) e as variáveis AI_ENDURANCE_* na Vercel. Veja o README.'
                  : 'Sua conta ainda não está vinculada a um atleta da AI Endurance (veja o README).'}
            </p>
          ) : (
            <>
              <Button className="w-fit" variant="outline" onClick={() => (buscarAie ? aie.refetch() : setBuscarAie(true))} disabled={aie.isFetching}>
                {aie.isFetching ? <LoaderCircleIcon className="animate-spin" /> : <CloudDownloadIcon />}
                {aie.data ? 'Buscar de novo' : 'Buscar treinos do plano'}
              </Button>
              {aie.error && <p className="text-destructive text-sm">{aie.error.message}</p>}
              {aie.data && aie.data.avisos.length > 0 && <Lista itens={aie.data.avisos} icone={TriangleAlertIcon} classe="text-amber-600" />}
              {aie.data && aie.data.treinos.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {aie.data.treinos.slice(0, 20).map((t) => {
                    const totais = totaisEstrutura(t.estrutura, perfil.data)
                    return (
                      <CardSugestao
                        key={t.referencia}
                        nome={t.nome}
                        estrutura={t.estrutura}
                        duracao_seg={totais.duracao_seg}
                        distancia_m={totais.distancia_m}
                        estimado={totais.estimado}
                        perfil={perfil.data}
                        proposito={t.descricao}
                        destaque={t.data ? <Badge variant="outline">para {ddmm(t.data)}</Badge> : null}
                        salvo={jaSalvas.has(chave(t.estrutura))}
                        salvando={salvar.isPending}
                        onSalvar={() => guardar(t.nome, t.estrutura, t.descricao)}
                        onAgendar={() => agendarEstrutura(t.nome, t.estrutura, { data: t.data })}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <ScaleIcon className="size-4" />
            Planejado × realizado
          </div>
          <p className="text-muted-foreground text-xs">
            Treinos agendados a partir de sugestões. Ao concluir na Agenda, vincule a atividade importada para comparar com as parciais.
          </p>
        </div>
        {comEstrutura.length ? (
          <ul className="divide-y border-t">
            {comEstrutura.map((p) => {
              const treino = p.treino_id ? (treinos.data ?? []).find((t) => t.id === p.treino_id) : undefined
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <IconeModalidade modalidade={p.modalidade} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.nome}</div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                      <span>{ddmm(p.data)}</span>
                      <SeloStatus efetivo={statusEfetivo(p, hoje)} className="text-foreground" />
                      {p.status === 'concluido' && !p.treino_id && <span>sem atividade vinculada</span>}
                    </div>
                  </div>
                  {treino && (
                    <Button size="sm" variant="outline" onClick={() => setComparar(treino)}>
                      Comparar
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground border-t px-4 py-6 text-center text-sm">Nenhum treino com estrutura nas últimas 8 semanas.</p>
        )}
      </Card>

      {!temLimiar(m, perfil.data) && (
        <p className="text-muted-foreground text-xs">
          Dica: com {m === 'corrida' ? 'o pace de limiar' : m === 'ciclismo' ? 'o FTP' : 'o CSS'} no Perfil do atleta, cada bloco ganha o alvo exato de{' '}
          {m === 'ciclismo' ? 'potência' : 'ritmo'}.
        </p>
      )}

      <DialogAgendarSugestao pedido={pedido} perfil={perfil.data} onFechar={() => setPedido(null)} />
      <DialogTreino aberto={comparar !== null} treino={comparar} perfil={perfil.data} onFechar={() => setComparar(null)} />
    </div>
  )
}
