import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardListIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Bloco, Dado, diferencaKg, kg, Nota, sinal } from '@/components/triathlon/corpo/Blocos'
import { CardPlano } from '@/components/triathlon/corpo/CardPlano'
import { DialogMedicao } from '@/components/triathlon/corpo/DialogMedicao'
import { Indicador, ReguaFaixas, SeloFaixa, TabelaFaixas } from '@/components/triathlon/corpo/Faixas'
import { GraficoComposicao, GraficoMedidas, GraficoPeso } from '@/components/triathlon/corpo/GraficosCorpo'
import { HistoricoMedicoes } from '@/components/triathlon/corpo/HistoricoMedicoes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePerfilAtleta, usePesagens, useSalvarPerfil, useSalvarPesagem, useTreinosRecentes } from '@/hooks/useTriathlon'
import {
  ALVOS_GORDURA,
  avaliarCorpo,
  carboPorKg,
  classificar,
  dataCurta,
  ESCALA_IMC,
  formatarValor,
  gastoDiario,
  imcDe,
  lerTendencia,
  pesoParaImc,
  pesosIdeais,
  planoDoPerfil,
  previsaoMeta,
  taxasBasais,
  type Avaliacao,
  type Faixa,
} from '@/lib/corpo'
import { dataLocal, formatarDecimal, formatarInteiro, idade } from '@/lib/triathlon'
import { ROTAS_TRIATHLON } from '@/modulos'
import type { PerfilAtleta, Pesagem, Treino } from '@/types/triathlon'

const lerNumero = (t: string) => (t.trim() ? Number(t.trim().replace(',', '.')) : null)
const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

// -----------------------------------------------------------------------------
// Registro rápido e dados pessoais
// -----------------------------------------------------------------------------

function CardRegistro({ onCompleta }: { onCompleta: (inicial: Partial<Pesagem>) => void }) {
  const salvar = useSalvarPesagem()
  const hoje = dataLocal(new Date())
  const [data, setData] = useState(hoje)
  const [peso, setPeso] = useState('')

  async function registrar(e: FormEvent) {
    e.preventDefault()
    const n = lerNumero(peso)
    if (n === null || !Number.isFinite(n) || n < 30 || n > 250) return toast.error('Informe um peso entre 30 e 250 kg.')
    try {
      // só o peso: se o dia já tem medidas, elas continuam
      await salvar.mutateAsync({ dados: { data, peso_kg: n } })
      toast.success('Peso registrado.')
      setPeso('')
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Registrar peso</CardTitle>
        <CardDescription>Uma medição por dia. De preferência de manhã, em jejum, depois de ir ao banheiro.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={registrar} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="data-peso" className="text-xs">
              Data
            </Label>
            <Input id="data-peso" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kg" className="text-xs">
              Peso (kg)
            </Label>
            <Input id="kg" inputMode="decimal" placeholder="74,5" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-28" />
          </div>
          <Button type="submit" disabled={salvar.isPending || !peso}>
            {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
            Registrar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const n = lerNumero(peso)
              onCompleta({ data, peso_kg: n !== null && Number.isFinite(n) ? n : undefined })
            }}
          >
            <ClipboardListIcon />
            Medição completa
          </Button>
        </form>
        <p className="text-muted-foreground mt-2 text-xs">
          A medição completa inclui os dados da balança de bioimpedância (gordura, músculo, água…) e as circunferências.
        </p>
      </CardContent>
    </Card>
  )
}

function CardSeusDados({ perfil }: { perfil: PerfilAtleta | null | undefined }) {
  const salvar = useSalvarPerfil()
  const [altura, setAltura] = useState(texto(perfil?.altura_cm))
  const [sexo, setSexo] = useState<string>(perfil?.sexo ?? '')
  const [nascimento, setNascimento] = useState(perfil?.data_nascimento ?? '')
  const anos = idade(nascimento || null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const a = lerNumero(altura)
    if (a !== null && (!Number.isFinite(a) || a < 100 || a > 250)) return toast.error('Altura em centímetros, entre 100 e 250 (ex.: 178).')
    if (nascimento && (nascimento > dataLocal(new Date()) || (anos ?? 0) > 110)) return toast.error('Data de nascimento inválida.')
    try {
      await salvar.mutateAsync({
        altura_cm: a,
        sexo: (sexo || null) as PerfilAtleta['sexo'],
        data_nascimento: nascimento || null,
      })
      toast.success('Dados salvos.')
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Seus dados</CardTitle>
        <CardDescription>Altura, sexo e idade entram no IMC, na % de gordura e no gasto calórico.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid grid-cols-2 items-end gap-3" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="altura" className="text-xs">
              Altura (cm)
            </Label>
            <Input id="altura" inputMode="decimal" placeholder="178" value={altura} onChange={(e) => setAltura(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sexo" className="text-xs">
              Sexo
            </Label>
            <NativeSelect id="sexo" value={sexo} onChange={(e) => setSexo(e.target.value)}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nascimento" className="text-xs">
              Nascimento {anos !== null && anos >= 0 && <span className="text-muted-foreground font-normal">· {anos} anos</span>}
            </Label>
            <Input id="nascimento" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={salvar.isPending}>
              {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
              Salvar dados
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Cartões de avaliação
// -----------------------------------------------------------------------------

/** Peso correspondente a cada faixa de IMC na altura da pessoa. */
function pesoDaFaixa(x: Faixa, alturaCm: number) {
  const p = (imc: number) => formatarDecimal(pesoParaImc(imc, alturaCm))
  if (x.de === -Infinity) return `< ${p(x.ate)}`
  if (x.ate === Infinity) return `≥ ${p(x.de)}`
  return `${p(x.de)} – ${p(x.ate - 0.1)}`
}

function CardImc({ a }: { a: Avaliacao }) {
  if (!a.imc || !a.alturaCm || !a.faixaSaudavel) {
    return (
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Índice de massa corporal (IMC)</CardTitle>
          <CardDescription>Informe sua altura em “Seus dados” para calcular.</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  const [minimo, maximo] = a.faixaSaudavel
  const peso = a.atual.peso_kg
  const posicao =
    peso > maximo
      ? `Você está ${kg(peso - maximo)} acima do limite da faixa normal.`
      : peso < minimo
        ? `Você está ${kg(minimo - peso)} abaixo do limite da faixa normal.`
        : `Você está dentro da faixa: ${kg(maximo - peso)} até o limite de cima e ${kg(peso - minimo)} até o de baixo.`

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Índice de massa corporal (IMC)</CardTitle>
        <CardDescription>
          Peso ÷ altura² = {formatarDecimal(peso)} ÷ ({formatarValor(a.alturaCm / 100, { casas: 2 })})²
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatarValor(a.imc.valor, a.imc.escala)}</span>
          <span className="text-muted-foreground text-sm">kg/m²</span>
          <SeloFaixa faixa={a.imc.faixa} className="text-base font-medium" />
        </div>
        <ReguaFaixas leitura={a.imc} />
        <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm">
          Para {formatarValor(a.alturaCm / 100, { casas: 2 })} m, o peso normal vai de{' '}
          <strong className="tabular-nums">{kg(minimo)}</strong> a <strong className="tabular-nums">{kg(maximo)}</strong>. {posicao}
        </div>
        <TabelaFaixas leitura={a.imc} extra={(x) => pesoDaFaixa(x, a.alturaCm!)} />
        {a.imcIdoso && <Indicador titulo="Classificação para 60 anos ou mais" leitura={a.imcIdoso} />}
        <Nota>
          O IMC não separa músculo de gordura: quem tem muita massa muscular pode aparecer como sobrepeso sem ter gordura
          sobrando. Por isso confira também a % de gordura e a cintura.
          {a.anos !== null && a.anos < 20 && ' Abaixo de 20 anos o IMC é avaliado por curvas de idade (OMS); esta tabela é para adultos.'}
        </Nota>
        <p className="text-muted-foreground text-[11px]">Fonte: {a.imc.escala.fonte}.</p>
      </CardContent>
    </Card>
  )
}

function CardGordura({ a }: { a: Avaliacao }) {
  const semDados = (
    <CardDescription>
      {a.sexo ? '' : 'Informe o sexo em “Seus dados”. '}
      Registre a % de gordura da balança de bioimpedância ou meça cintura e pescoço{a.sexo === 'F' ? ' e quadril' : ''} na
      medição completa{a.anos === null ? ' (com a data de nascimento também dá para estimar pelo IMC)' : ''}.
    </CardDescription>
  )
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Gordura corporal</CardTitle>
        {!a.gordura && semDados}
        {a.gordura && <CardDescription>Método: {a.gordura.estimativa.metodo.toLowerCase()} — {a.gordura.estimativa.detalhe}.</CardDescription>}
      </CardHeader>
      {a.gordura && (
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatarValor(a.gordura.valor, a.gordura.escala)}%</span>
            <SeloFaixa faixa={a.gordura.faixa} className="text-base font-medium" />
          </div>
          <ReguaFaixas leitura={a.gordura} />
          <dl className="grid grid-cols-2 gap-2">
            <Dado rotulo="Massa gorda" valor={kg(a.massaGorda!)} />
            <Dado rotulo="Massa magra" valor={kg(a.massaMagra!)} detalhe="músculos, ossos, órgãos e água" />
          </dl>
          <TabelaFaixas leitura={a.gordura} />
          {a.estimativas.length > 1 && (
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Comparando os métodos</div>
              <ul className="divide-y rounded-lg border text-sm">
                {a.estimativas.map((e, i) => (
                  <li key={e.metodo} className="flex items-center gap-3 px-3 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div>
                        {e.metodo}
                        {i === 0 && <span className="text-muted-foreground ml-1.5 text-xs">(usado)</span>}
                      </div>
                      <div className="text-muted-foreground text-xs">{e.detalhe}</div>
                    </div>
                    <span className="font-medium tabular-nums">{formatarDecimal(e.pct)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.ffmi && (
            <Indicador
              titulo="Índice de massa magra (FFMI)"
              leitura={a.ffmi}
              detalhe="massa magra ÷ altura², ajustado para 1,80 m"
            />
          )}
          <p className="text-muted-foreground text-[11px]">Fonte das faixas: {a.gordura.escala.fonte}.</p>
        </CardContent>
      )}
    </Card>
  )
}

function CardRisco({ a }: { a: Avaliacao }) {
  const itens = [
    a.cintura && <Indicador key="cintura" titulo="Cintura" leitura={a.cintura} detalhe={`medida em ${dataCurta(a.cintura.data)}`} />,
    a.rcest && <Indicador key="rcest" titulo="Cintura ÷ altura" leitura={a.rcest} />,
    a.rcq && <Indicador key="rcq" titulo="Cintura ÷ quadril" leitura={a.rcq} />,
    a.visceral && (
      <Indicador key="visceral" titulo="Gordura visceral" leitura={a.visceral} detalhe={`balança, ${dataCurta(a.visceral.data)}`} />
    ),
  ].filter(Boolean)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Gordura abdominal e risco</CardTitle>
        <CardDescription>
          A gordura na barriga pesa mais para o coração e o metabolismo do que o peso total.
          {itens.length === 0 &&
            (a.sexo
              ? ' Meça a cintura (e o quadril) na medição completa para ver estes índices.'
              : ' Informe o sexo em “Seus dados” e meça a cintura na medição completa.')}
        </CardDescription>
      </CardHeader>
      {itens.length > 0 && <CardContent className="grid gap-5">{itens}</CardContent>}
    </Card>
  )
}

function CardBioimpedancia({ a }: { a: Avaliacao }) {
  const peso = a.atual.peso_kg
  const tem = a.agua || a.musculo || a.osso
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Bioimpedância</CardTitle>
        <CardDescription>
          {tem
            ? 'Valores da balança. Compare sempre na mesma balança e no mesmo horário: hidratação muda bastante a leitura.'
            : 'Se você tem balança de bioimpedância, registre os valores dela na medição completa.'}
        </CardDescription>
      </CardHeader>
      {tem && (
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-2 gap-2">
            {a.musculo && (
              <Dado
                rotulo="Massa muscular"
                valor={kg(a.musculo.valor)}
                detalhe={`${formatarDecimal((a.musculo.valor / peso) * 100)}% do peso · ${dataCurta(a.musculo.data)}`}
              />
            )}
            {a.osso && <Dado rotulo="Massa óssea" valor={kg(a.osso.valor)} detalhe={dataCurta(a.osso.data)} />}
          </dl>
          {a.agua && <Indicador titulo="Água corporal" leitura={a.agua} detalhe={dataCurta(a.agua.data)} />}
        </CardContent>
      )}
    </Card>
  )
}

function CardReferencia({ a, meta }: { a: Avaliacao; meta: number | null }) {
  if (!a.alturaCm || !a.faixaSaudavel) return null
  const peso = a.atual.peso_kg
  const formulas = a.sexo ? pesosIdeais(a.alturaCm, a.sexo) : []
  const mediaFormulas = formulas.length ? formulas.reduce((s, x) => s + x.valor, 0) / formulas.length : null
  const imcMeta = meta ? classificar(imcDe(meta, a.alturaCm), ESCALA_IMC) : null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Peso de referência</CardTitle>
        <CardDescription>Diferentes jeitos de pensar no “peso certo” para a sua altura. Use como faixa, não como número exato.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-2">
          <Dado rotulo="Faixa normal (IMC)" valor={`${formatarValor(a.faixaSaudavel[0], { casas: 1 })} – ${kg(a.faixaSaudavel[1])}`} />
          <Dado rotulo="IMC 22 (meio da faixa)" valor={kg(pesoParaImc(22, a.alturaCm))} />
          {mediaFormulas && <Dado rotulo="Média das fórmulas" valor={kg(mediaFormulas)} detalhe="Devine, Robinson, Miller e Hamwi" />}
          {meta && imcMeta && (
            <Dado rotulo="Sua meta" valor={kg(meta)} detalhe={`IMC ${formatarValor(imcMeta.valor, imcMeta.escala)} — ${imcMeta.faixa.rotulo.toLowerCase()}`} />
          )}
        </dl>

        {formulas.length > 0 && (
          <table className="w-full text-sm tabular-nums">
            <caption className="text-muted-foreground mb-1 text-left text-xs">Fórmulas clássicas de peso ideal</caption>
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="sr-only">Fórmula</th>
                <th className="text-right font-normal">Peso</th>
                <th className="text-right font-normal">Você até ele</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {formulas.map((x) => (
                <tr key={x.nome}>
                  <td className="py-1.5">
                    {x.nome} <span className="text-muted-foreground text-xs">({x.detalhe})</span>
                  </td>
                  <td className="py-1.5 text-right font-medium">{kg(x.valor)}</td>
                  <td className="text-muted-foreground w-24 py-1.5 text-right text-xs">{diferencaKg(x.valor - peso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {a.massaMagra && a.sexo && (
          <table className="w-full text-sm tabular-nums">
            <caption className="text-muted-foreground mb-1 text-left text-xs">
              Peso para cada % de gordura mantendo sua massa magra ({kg(a.massaMagra)})
            </caption>
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="sr-only">Gordura</th>
                <th className="text-right font-normal">Peso</th>
                <th className="text-right font-normal">Você até ele</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ALVOS_GORDURA[a.sexo].map((alvo) => {
                const alvoKg = a.massaMagra! / (1 - alvo / 100)
                return (
                  <tr key={alvo}>
                    <td className="py-1.5">{alvo}% de gordura</td>
                    <td className="py-1.5 text-right font-medium">{kg(alvoKg)}</td>
                    <td className="text-muted-foreground w-24 py-1.5 text-right text-xs">{diferencaKg(alvoKg - peso)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <Nota>
          Para atletas, o peso de prova costuma ser melhor definido pela % de gordura do que pelas fórmulas, que só olham a
          altura.
        </Nota>
      </CardContent>
    </Card>
  )
}

function CardEnergia({ a, treinos }: { a: Avaliacao; treinos: Treino[] }) {
  const peso = a.atual.peso_kg
  const { treinos: treino, total } = gastoDiario(a, treinos)
  const basais = a.alturaCm && a.sexo && a.anos !== null ? taxasBasais(peso, a.alturaCm, a.anos, a.sexo, a.massaMagra) : []
  const carbo = carboPorKg(treino.horasDia)
  const g = (n: number) => `${formatarInteiro(Math.round(n))} g`

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Gasto e necessidades diárias</CardTitle>
        <CardDescription>
          {basais.length
            ? `Com seu peso atual e a média de treinos dos últimos ${treino.dias} dias.`
            : 'Preencha altura, sexo e nascimento em “Seus dados” para calcular a taxa basal e o gasto total.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {basais.length > 0 && (
          <table className="w-full text-sm tabular-nums">
            <caption className="text-muted-foreground mb-1 text-left text-xs">Taxa metabólica basal (em repouso absoluto)</caption>
            <tbody className="divide-y">
              {basais.map((x) => (
                <tr key={x.nome}>
                  <td className="py-1.5">
                    {x.nome} <span className="text-muted-foreground text-xs">— {x.detalhe}</span>
                  </td>
                  <td className="py-1.5 text-right font-medium whitespace-nowrap">{formatarInteiro(x.valor)} kcal</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <dl className="grid grid-cols-2 gap-2">
          <Dado
            rotulo="Treinos (média por dia)"
            valor={`${formatarInteiro(treino.kcalDia)} kcal`}
            detalhe={
              treino.quantidade
                ? `${treino.quantidade} treino(s), ${formatarDecimal(treino.horasDia * 7)} h/semana${treino.estimados ? ` · ${treino.estimados} sem calorias, estimados` : ''}`
                : 'nenhum treino no período'
            }
          />
          {total && <Dado rotulo="Gasto total estimado" valor={`${formatarInteiro(total)} kcal/dia`} detalhe="basal × 1,2 + treinos" />}
        </dl>
        <div className="grid gap-1.5">
          <div className="text-sm font-medium">Referências para o seu peso</div>
          <dl className="grid grid-cols-2 gap-2">
            <Dado rotulo="Proteína" valor={`${g(peso * 1.6)} – ${g(peso * 2)}`} detalhe="1,6 a 2,0 g/kg" />
            <Dado
              rotulo="Carboidrato"
              valor={`${g(peso * carbo.de)} – ${g(peso * carbo.ate)}`}
              detalhe={`${carbo.de} a ${carbo.ate} g/kg (${carbo.nivel})`}
            />
            {total && <Dado rotulo="Gordura" valor={`${g((total * 0.2) / 9)} – ${g((total * 0.35) / 9)}`} detalhe="20 a 35% das calorias" />}
            <Dado
              rotulo="Água"
              valor={`${formatarDecimal(peso * 0.035)} L`}
              detalhe="35 ml/kg + 0,5 a 0,75 L por hora de treino"
            />
          </dl>
        </div>
        <Nota>
          Quer usar esses números como meta? Defina calorias e macros no{' '}
          <Link to={ROTAS_TRIATHLON.perfil} className="text-primary underline">
            Perfil do atleta
          </Link>
          ; eles aparecem na Nutrição.
        </Nota>
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

function ResumoPeso({ a, meta }: { a: Avaliacao; meta: number | null }) {
  const t = a.tendencia
  const previsao = meta && t ? previsaoMeta(a.media7, meta, t.kgSemana) : null
  const atingida = meta !== null && Math.abs(a.media7 - meta) < 0.3
  return (
    <dl className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-4 sm:px-0">
      <Dado rotulo="Menor peso" valor={kg(a.minimo.peso_kg)} detalhe={dataCurta(a.minimo.data)} />
      <Dado rotulo="Maior peso" valor={kg(a.maximo.peso_kg)} detalhe={dataCurta(a.maximo.data)} />
      <Dado
        rotulo="Desde o início"
        valor={diferencaKg(a.atual.peso_kg - a.primeira.peso_kg)}
        detalhe={`desde ${dataCurta(a.primeira.data)}`}
      />
      {meta ? (
        <Dado
          rotulo="Meta"
          valor={atingida ? 'Atingida' : `faltam ${kg(Math.abs(a.media7 - meta))}`}
          detalhe={
            atingida
              ? `média de 7 dias perto de ${kg(meta)}`
              : previsao
                ? `no ritmo atual, por volta de ${dataCurta(previsao.data)}`
                : t
                  ? 'o ritmo atual não leva até ela'
                  : 'pese-se mais vezes para prever'
          }
        />
      ) : (
        <Dado rotulo="Meta" valor="—" detalhe="defina no plano abaixo" />
      )}
    </dl>
  )
}

export default function CorpoTriathlon() {
  const pesagens = usePesagens()
  const perfil = usePerfilAtleta()
  const treinos = useTreinosRecentes()
  const [dialogo, setDialogo] = useState<{ aberto: boolean; medicao: Partial<Pesagem> | null }>({ aberto: false, medicao: null })

  const lista = pesagens.data ?? []
  const a = avaliarCorpo(lista, perfil.data)
  const meta = perfil.data?.peso_meta_kg ?? null
  const plano = planoDoPerfil(perfil.data)
  const leituraTendencia = a?.tendencia ? lerTendencia(a.tendencia) : null
  const carregando = pesagens.isLoading || perfil.isLoading

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Corpo</h1>
          <p className="text-muted-foreground text-sm">Peso, IMC, composição corporal e medidas, com as faixas de referência.</p>
        </div>
        <Button onClick={() => setDialogo({ aberto: true, medicao: null })}>
          <PlusIcon />
          Nova medição
        </Button>
      </div>

      {carregando ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <CardRegistro onCompleta={(inicial) => setDialogo({ aberto: true, medicao: inicial })} />
          <CardSeusDados key={perfil.data ? 'carregado' : 'vazio'} perfil={perfil.data} />
        </div>
      )}

      {!carregando && !a && (
        <Card className="items-center gap-2 px-6 py-10 text-center">
          <p className="font-medium">Nenhuma pesagem ainda</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Registre seu peso acima e informe sua altura: o IMC, a faixa de peso normal e o resto dos cálculos aparecem aqui.
          </p>
        </Card>
      )}

      {a && (
        <>
          <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Bloco rotulo="Peso atual" valor={kg(a.atual.peso_kg)} detalhe={`média 7 dias: ${kg(a.media7)} · ${dataCurta(a.atual.data)}`} />
            <Bloco
              rotulo="IMC"
              valor={a.imc ? formatarValor(a.imc.valor, a.imc.escala) : '—'}
              detalhe={a.imc ? <SeloFaixa faixa={a.imc.faixa} className="text-foreground text-xs" /> : 'informe a altura'}
            />
            <Bloco
              rotulo="Gordura corporal"
              valor={a.gordura ? `${formatarValor(a.gordura.valor, a.gordura.escala)}%` : '—'}
              detalhe={
                a.gordura ? (
                  <SeloFaixa faixa={a.gordura.faixa} className="text-foreground text-xs" />
                ) : (
                  'registre na medição completa'
                )
              }
            />
            <Bloco
              rotulo="Tendência (4 semanas)"
              valor={a.tendencia ? `${sinal(a.tendencia.kgSemana)}${formatarDecimal(Math.abs(a.tendencia.kgSemana))} kg/sem` : '—'}
              detalhe={
                leituraTendencia ? (
                  <span title={leituraTendencia.descricao}>
                    <SeloFaixa faixa={leituraTendencia} className="text-foreground text-xs" />
                    <span className="mt-0.5 block">{leituraTendencia.descricao}</span>
                  </span>
                ) : (
                  'precisa de 3 pesagens em pelo menos 1 semana'
                )
              }
            />
          </section>

          <GraficoPeso pesagens={lista} meta={meta} faixaSaudavel={a.faixaSaudavel} plano={plano} rodape={<ResumoPeso a={a} meta={meta} />} />

          <CardPlano
            key={[perfil.data?.peso_meta_kg, perfil.data?.meta_semanal_kg, perfil.data?.meta_inicio, perfil.data?.meta_peso_inicial_kg].join('|')}
            a={a}
            perfil={perfil.data}
            pesagens={lista}
            treinos={treinos.data ?? []}
          />

          <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-2">
            <CardImc a={a} />
            <CardGordura a={a} />
            <CardRisco a={a} />
            <CardBioimpedancia a={a} />
            <CardReferencia a={a} meta={meta} />
            <CardEnergia a={a} treinos={treinos.data ?? []} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <GraficoComposicao pesagens={lista} sexo={a.sexo} alturaCm={a.alturaCm} />
            <GraficoMedidas pesagens={lista} />
          </div>

          <HistoricoMedicoes pesagens={lista} alturaCm={a.alturaCm} onEditar={(p) => setDialogo({ aberto: true, medicao: p })} />
        </>
      )}

      <DialogMedicao
        aberto={dialogo.aberto}
        medicao={dialogo.medicao}
        pesagens={lista}
        onFechar={() => setDialogo({ aberto: false, medicao: null })}
      />
    </div>
  )
}
