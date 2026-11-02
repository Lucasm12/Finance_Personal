import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { EditorExercicios, ListaExercicios } from '@/components/triathlon/forca/Exercicios'
import { SeletorModalidade } from '@/components/triathlon/SeletorModalidade'
import { ComparacaoDoPlanejado } from '@/components/triathlon/sugestoes/ComparacaoPlano'
import { VisaoEstrutura } from '@/components/triathlon/sugestoes/VisaoEstrutura'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useSugestoesSalvas } from '@/hooks/useSugestoes'
import { useExcluirTreinoPlanejado, usePerfilAtleta, useRotinaAtiva, useSalvarTreinoPlanejado, useSeriesForca } from '@/hooks/useTriathlon'
import { emMetros, MODALIDADES_AGENDA, naUnidade, ORDEM_STATUS, STATUS, UNIDADE } from '@/lib/agenda'
import { NOMES_GRUPO, NOMES_NIVEL } from '@/lib/forca/exercicios'
import { gruposRecentes } from '@/lib/forca/progressao'
import { duracaoEstimada } from '@/lib/forca/recomendacao'
import { CATALOGO, MODELO_POR_ID, OBJETIVOS_ENDURANCE } from '@/lib/sugestoes/catalogo'
import { resumoEstrutura, totaisEstrutura } from '@/lib/sugestoes/estrutura'
import { dataLocal, duracaoRelogio, lerDuracao, MODALIDADES, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { EstruturaTreino, ExercicioPrescrito, ModalidadeAgenda, NivelForca, StatusTreino, TreinoPlanejado, TreinoPlanejadoInput } from '@/types/triathlon'

const EXEMPLOS: Record<ModalidadeAgenda, string> = {
  corrida: 'Ex.: Rodagem leve, Intervalado 6×800 m',
  natacao: 'Ex.: Técnica + educativos, 10×100 m',
  ciclismo: 'Ex.: Longão de pedal, Rolo Z2',
  forca: 'Ex.: Treino A — pernas e core',
}

const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(Math.round(n * 100) / 100).replace('.', ','))
const lerNumero = (t: string) => {
  const v = t.trim().replace(',', '.')
  return v ? Number(v) : null
}

interface FormProps {
  treino: TreinoPlanejado | null
  dataInicial: string
  onFechar: () => void
}

function FormPlanejado({ treino, dataInicial, onFechar }: FormProps) {
  const salvar = useSalvarTreinoPlanejado()
  const excluir = useExcluirTreinoPlanejado()
  const [modalidade, setModalidade] = useState<ModalidadeAgenda>(treino?.modalidade ?? 'corrida')
  const [data, setData] = useState(treino?.data ?? dataInicial)
  const [nome, setNome] = useState(treino?.nome ?? '')
  const [descricao, setDescricao] = useState(treino?.descricao ?? '')
  const [distancia, setDistancia] = useState(() =>
    treino?.distancia_planejada_m ? texto(naUnidade(treino.modalidade, treino.distancia_planejada_m)) : '',
  )
  const [duracao, setDuracao] = useState(treino?.duracao_planejada_seg ? duracaoRelogio(treino.duracao_planejada_seg) : '')
  const [observacao, setObservacao] = useState(treino?.observacao ?? '')
  const [status, setStatus] = useState<StatusTreino>(treino?.status ?? 'pendente')
  const [distanciaFeita, setDistanciaFeita] = useState(() =>
    treino?.distancia_realizada_m !== null && treino?.distancia_realizada_m !== undefined
      ? texto(naUnidade(treino.modalidade, treino.distancia_realizada_m))
      : '',
  )
  const [duracaoFeita, setDuracaoFeita] = useState(treino?.duracao_realizada_seg ? duracaoRelogio(treino.duracao_realizada_seg) : '')
  const [erro, setErro] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const academia = modalidade === 'forca'

  // academia: treino da rotina de força e os exercícios do dia
  const rotina = useRotinaAtiva()
  const [rotinaTreino, setRotinaTreino] = useState(treino?.rotina_treino ?? '')
  const [exercicios, setExercicios] = useState<ExercicioPrescrito[] | null>(treino?.exercicios ?? null)
  const [editandoExercicios, setEditandoExercicios] = useState(false)
  const recentes = useSeriesForca(somarDias(data || dataLocal(new Date()), -2), somarDias(data || dataLocal(new Date()), -1))
  const conflitos = academia && exercicios ? gruposRecentes(recentes.data ?? [], data).filter((g) => exercicios.some((x) => x.grupo === g)) : []

  // corrida, natação e pedal: estrutura vinda de um treino salvo ou do catálogo de sugestões
  const perfil = usePerfilAtleta()
  const salvas = useSugestoesSalvas()
  const [estrutura, setEstrutura] = useState<EstruturaTreino | null>(treino?.estrutura ?? null)
  const [sugestaoId, setSugestaoId] = useState<string | null>(treino?.sugestao_id ?? null)
  const [nivelCatalogo, setNivelCatalogo] = useState<NivelForca>(treino?.estrutura?.nivel ?? 'intermediario')
  const [verComparacao, setVerComparacao] = useState(false)
  const estruturaValida = !academia && estrutura?.modalidade === modalidade ? estrutura : null
  const salvasDaModalidade = (salvas.data ?? []).filter((s) => s.modalidade === modalidade)
  const catalogo = CATALOGO.filter((x) => x.modalidade === modalidade && x.niveis.includes(nivelCatalogo))

  function usarEstrutura(e: EstruturaTreino, nomeTreino: string, id: string | null, duracaoSeg?: number | null, distanciaM?: number | null) {
    const t = totaisEstrutura(e, perfil.data)
    setEstrutura(e)
    setSugestaoId(id)
    setNome(nomeTreino)
    setDescricao(resumoEstrutura(e))
    const seg = duracaoSeg ?? t.duracao_seg
    const metros = distanciaM ?? t.distancia_m
    setDuracao(seg ? duracaoRelogio(seg) : '')
    setDistancia(metros && modalidade !== 'forca' ? texto(naUnidade(modalidade, metros)) : '')
  }

  function escolherSugestao(valor: string) {
    if (!valor) return
    const [tipo, id] = [valor.slice(0, valor.indexOf(':')), valor.slice(valor.indexOf(':') + 1)]
    if (tipo === 'salva') {
      const s = salvasDaModalidade.find((x) => x.id === id)
      if (s) usarEstrutura(s.estrutura, s.nome, s.id, s.duracao_seg, s.distancia_m)
      return
    }
    const modelo = MODELO_POR_ID.get(id)
    if (!modelo || modelo.modalidade !== modalidade) return
    usarEstrutura(
      { modalidade: modelo.modalidade, objetivo: modelo.objetivo, nivel: nivelCatalogo, blocos: modelo.montar(nivelCatalogo), fonte: 'catalogo', referencia: modelo.id },
      modelo.nome,
      null,
    )
  }

  function escolherTreinoRotina(letra: string) {
    setRotinaTreino(letra)
    const t = rotina.data?.treinos.find((x) => x.letra === letra)
    if (!t) {
      setExercicios(null)
      return
    }
    setExercicios(t.exercicios)
    setNome(`Treino ${t.letra} — ${t.nome}`)
    setDescricao(t.foco)
    setDuracao(duracaoRelogio(duracaoEstimada(t.exercicios) * 60))
  }

  function mudarStatus(s: StatusTreino) {
    setStatus(s)
    // ao marcar como concluído, já sugere o planejado como realizado
    if (s === 'concluido' && !distanciaFeita && !duracaoFeita) {
      setDistanciaFeita(distancia)
      setDuracaoFeita(duracao)
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!data) return setErro('Informe a data.')
    const km = academia ? null : lerNumero(distancia)
    if (km !== null && (!Number.isFinite(km) || km <= 0)) return setErro('Distância planejada inválida.')
    const seg = duracao.trim() ? lerDuracao(duracao) : null
    if (duracao.trim() && !seg) return setErro('Duração estimada no formato 45, 45:00 ou 1:20:00.')
    const concluido = status === 'concluido'
    const kmFeito = concluido && !academia ? lerNumero(distanciaFeita) : null
    if (kmFeito !== null && (!Number.isFinite(kmFeito) || kmFeito < 0)) return setErro('Distância feita inválida.')
    const segFeito = concluido && duracaoFeita.trim() ? lerDuracao(duracaoFeita) : null
    if (concluido && duracaoFeita.trim() && !segFeito) return setErro('Duração feita no formato 45, 45:00 ou 1:20:00.')

    const dados: TreinoPlanejadoInput = {
      modalidade,
      data,
      nome: nome.trim() || MODALIDADES[modalidade].nome,
      descricao: descricao.trim() || null,
      distancia_planejada_m: km === null ? null : emMetros(modalidade, km),
      duracao_planejada_seg: seg,
      observacao: observacao.trim() || null,
      status,
      distancia_realizada_m: kmFeito === null ? null : emMetros(modalidade, kmFeito),
      duracao_realizada_seg: segFeito,
      // o vínculo com a atividade registrada só vale enquanto continuar concluído e na mesma modalidade
      treino_id: concluido && treino?.modalidade === modalidade ? (treino?.treino_id ?? null) : null,
      concluido_em: concluido ? (treino?.concluido_em ?? new Date().toISOString()) : null,
      rotina_id: academia && rotinaTreino ? (treino?.rotina_treino === rotinaTreino ? treino.rotina_id : (rotina.data?.id ?? null)) : null,
      rotina_treino: academia && rotinaTreino ? rotinaTreino : null,
      exercicios: academia && exercicios?.length ? exercicios : null,
      estrutura: estruturaValida,
      sugestao_id: estruturaValida ? sugestaoId : null,
    }
    try {
      await salvar.mutateAsync({ id: treino?.id, dados })
      toast.success(treino ? (treino.data !== data ? 'Treino reagendado.' : 'Treino atualizado.') : 'Treino planejado.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  function remover() {
    if (!treino) return
    excluir.mutate(treino.id, { onSuccess: () => toast.success('Treino excluído da agenda.') })
    onFechar()
  }

  const sigla = UNIDADE[modalidade].sigla

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{treino ? 'Editar treino planejado' : 'Planejar treino'}</DialogTitle>
        <DialogDescription>
          {treino ? 'Mude a data para reagendar. ' : ''}Pode haver vários treinos no mesmo dia, inclusive de modalidades diferentes.
        </DialogDescription>
      </DialogHeader>

      <SeletorModalidade value={modalidade} onChange={setModalidade} opcoes={MODALIDADES_AGENDA} />

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="plan-data" className="text-xs">
            Data
          </Label>
          <Input id="plan-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="plan-nome" className="text-xs">
            Nome do treino
          </Label>
          <Input id="plan-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={MODALIDADES[modalidade].nome} />
        </div>
      </div>
      <p className="text-muted-foreground -mt-2 text-[11px]">{EXEMPLOS[modalidade]}</p>

      {academia && (
        <fieldset className="grid gap-2 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium">Treino de musculação</legend>
          {rotina.data ? (
            <NativeSelect value={rotinaTreino} onChange={(e) => escolherTreinoRotina(e.target.value)} aria-label="Treino da rotina">
              <option value="">Sem treino da rotina</option>
              {rotina.data.treinos.map((t) => (
                <option key={t.letra} value={t.letra}>
                  Treino {t.letra} — {t.nome} ({t.exercicios.length} exercícios)
                </option>
              ))}
            </NativeSelect>
          ) : (
            <p className="text-muted-foreground text-xs">
              {rotina.isLoading ? 'Carregando a rotina…' : 'Monte uma rotina na aba Musculação da Agenda para escolher os treinos A, B, C aqui.'}
            </p>
          )}
          {conflitos.length > 0 && (
            <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
              Recuperação: {conflitos.map((g) => NOMES_GRUPO[g].toLowerCase()).join(', ')} já foram treinados nas 48 h antes deste dia. Considere
              outro treino da rotina ou outra data.
            </p>
          )}
          {exercicios && exercicios.length > 0 && (
            <>
              {editandoExercicios && rotina.data ? (
                <EditorExercicios
                  exercicios={exercicios}
                  onChange={setExercicios}
                  local={rotina.data.local}
                  equipamentos={rotina.data.equipamentos}
                  nivel={rotina.data.nivel}
                />
              ) : (
                <ListaExercicios exercicios={exercicios} compacta />
              )}
              {rotina.data && (
                <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setEditandoExercicios(!editandoExercicios)}>
                  {editandoExercicios ? 'Concluir edição' : 'Editar exercícios deste dia'}
                </Button>
              )}
              <p className="text-muted-foreground text-[11px]">Mudar aqui vale só para este dia; a rotina continua igual.</p>
            </>
          )}
        </fieldset>
      )}

      {!academia && (
        <fieldset className="grid gap-2 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium">Estrutura do treino (opcional)</legend>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <NativeSelect value="" onChange={(e) => escolherSugestao(e.target.value)} aria-label="Usar um treino salvo ou do catálogo">
              <option value="">{estruturaValida ? 'Trocar por outro treino…' : 'Usar um treino salvo ou sugerido…'}</option>
              {salvasDaModalidade.length > 0 && (
                <optgroup label="Meus treinos salvos">
                  {salvasDaModalidade.map((s) => (
                    <option key={s.id} value={`salva:${s.id}`}>
                      {s.nome} ({NOMES_NIVEL[s.nivel]})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label={`Catálogo (${NOMES_NIVEL[nivelCatalogo].toLowerCase()})`}>
                {catalogo.map((x) => (
                  <option key={x.id} value={`cat:${x.id}`}>
                    {x.nome} — {OBJETIVOS_ENDURANCE[x.objetivo]}
                  </option>
                ))}
              </optgroup>
            </NativeSelect>
            <NativeSelect className="w-36" value={nivelCatalogo} onChange={(e) => setNivelCatalogo(e.target.value as NivelForca)} aria-label="Nível do catálogo">
              {(Object.entries(NOMES_NIVEL) as [NivelForca, string][]).map(([v, rotulo]) => (
                <option key={v} value={v}>
                  {rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          {estruturaValida ? (
            <>
              <VisaoEstrutura estrutura={estruturaValida} perfil={perfil.data} compacta />
              <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setEstrutura(null)}>
                Remover estrutura
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-[11px]">
              Com estrutura (aquecimento, séries e desaquecimento), o treino importado depois pode ser comparado com o planejado. Mais opções na aba Endurance.
            </p>
          )}
          {treino?.status === 'concluido' && treino.treino_id && treino.estrutura && (
            <div className="grid gap-2 border-t pt-2">
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setVerComparacao(!verComparacao)}>
                {verComparacao ? 'Esconder planejado × realizado' : 'Ver planejado × realizado'}
              </Button>
              {verComparacao && <ComparacaoDoPlanejado planejado={treino} />}
            </div>
          )}
        </fieldset>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="plan-desc" className="text-xs">
          Descrição ou objetivo (opcional)
        </Label>
        <Textarea id="plan-desc" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: ritmo confortável, Z2, foco na técnica" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!academia && (
          <div className="grid gap-1.5">
            <Label htmlFor="plan-dist" className="text-xs">
              Distância planejada ({sigla})
            </Label>
            <Input id="plan-dist" inputMode="decimal" placeholder={modalidade === 'natacao' ? '2000' : '10'} value={distancia} onChange={(e) => setDistancia(e.target.value)} />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="plan-dur" className="text-xs">
            Duração estimada (opcional)
          </Label>
          <Input id="plan-dur" inputMode="numeric" placeholder="1:00:00" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Situação</Label>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Situação">
          {ORDEM_STATUS.map((s) => {
            const info = STATUS[s]
            const ativo = s === status
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => mudarStatus(s)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                  ativo ? cn(info.fundo, 'border-transparent', s === 'pendente' ? 'text-black/75' : 'text-white') : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <info.icone className="size-4" />
                {info.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      {status === 'concluido' && (
        <fieldset className="grid gap-3 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium">O que foi feito (conta para a meta da semana)</legend>
          <div className="grid grid-cols-2 gap-3">
            {!academia && (
              <div className="grid gap-1.5">
                <Label htmlFor="feito-dist" className="text-xs">
                  Distância feita ({sigla})
                </Label>
                <Input id="feito-dist" inputMode="decimal" value={distanciaFeita} onChange={(e) => setDistanciaFeita(e.target.value)} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="feito-dur" className="text-xs">
                Duração feita
              </Label>
              <Input id="feito-dur" inputMode="numeric" placeholder="45:00" value={duracaoFeita} onChange={(e) => setDuracaoFeita(e.target.value)} />
            </div>
          </div>
        </fieldset>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="plan-obs" className="text-xs">
          Observações (opcional)
        </Label>
        <Textarea id="plan-obs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {confirmandoExclusao ? (
        <div className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-3 text-sm">
          <p>Excluir este treino da agenda? Se ele foi registrado em Treinos, a atividade continua lá.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmandoExclusao(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={remover}>
              Excluir
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className={cn(treino && 'sm:justify-between')}>
          {treino && (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmandoExclusao(true)}>
              <Trash2Icon />
              Excluir
            </Button>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      )}
    </form>
  )
}

interface Props {
  aberto: boolean
  treino: TreinoPlanejado | null
  /** data sugerida para um treino novo */
  data?: string
  onFechar: () => void
}

export function DialogPlanejado({ aberto, treino, data, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        {aberto && (
          <FormPlanejado key={treino?.id ?? `novo-${data}`} treino={treino} dataInicial={data ?? dataLocal(new Date())} onFechar={onFechar} />
        )}
      </DialogContent>
    </Dialog>
  )
}
