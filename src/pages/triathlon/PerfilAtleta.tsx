import { useState, type FormEvent, type ReactNode } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePerfilAtleta, usePesagens, useSalvarPerfil } from '@/hooks/useTriathlon'
import { ZONAS_FC, ZONAS_POTENCIA } from '@/lib/sugestoes/zonas'
import { formatarDecimal, formatarPace, lerDuracao, taxaBasal } from '@/lib/triathlon'
import type { PerfilAtleta, PerfilAtletaInput } from '@/types/triathlon'

// o plano de peso (meta semanal) é editado na página Corpo
type DadosPerfil = Omit<PerfilAtletaInput, 'meta_semanal_kg' | 'meta_inicio' | 'meta_peso_inicial_kg'>
type Campos = Record<keyof DadosPerfil, string>

const texto = (v: number | string | null | undefined) => (v === null || v === undefined ? '' : String(v).replace('.', ','))

function inicial(p: PerfilAtleta | null | undefined): Campos {
  return {
    data_nascimento: p?.data_nascimento ?? '',
    sexo: p?.sexo ?? '',
    altura_cm: texto(p?.altura_cm),
    ftp_w: texto(p?.ftp_w),
    fc_max: texto(p?.fc_max),
    fc_limiar: texto(p?.fc_limiar),
    pace_limiar_seg_km: p?.pace_limiar_seg_km ? formatarPace(p.pace_limiar_seg_km) : '',
    css_seg_100m: p?.css_seg_100m ? formatarPace(p.css_seg_100m) : '',
    peso_meta_kg: texto(p?.peso_meta_kg),
    kcal_meta: texto(p?.kcal_meta),
    proteina_meta_g: texto(p?.proteina_meta_g),
    carbo_meta_g: texto(p?.carbo_meta_g),
    gordura_meta_g: texto(p?.gordura_meta_g),
  }
}

function Campo({ id, rotulo, dica, children }: { id: string; rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {rotulo}
      </Label>
      {children}
      {dica && <p className="text-muted-foreground text-[11px] leading-snug">{dica}</p>}
    </div>
  )
}

function FormPerfil({ perfil, pesoAtual }: { perfil: PerfilAtleta | null | undefined; pesoAtual: number | null }) {
  const salvar = useSalvarPerfil()
  const [c, setC] = useState(() => inicial(perfil))
  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setC({ ...c, [k]: e.target.value })

  const numero = (t: string) => (t.trim() ? Number(t.trim().replace(',', '.')) : null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const pace = c.pace_limiar_seg_km.trim() ? lerDuracao(c.pace_limiar_seg_km) : null
    const css = c.css_seg_100m.trim() ? lerDuracao(c.css_seg_100m) : null
    if ((c.pace_limiar_seg_km.trim() && !pace) || (c.css_seg_100m.trim() && !css)) {
      return toast.error('Use o formato m:ss para pace e CSS (ex.: 4:45).')
    }
    const dados: DadosPerfil = {
      data_nascimento: c.data_nascimento || null,
      sexo: (c.sexo || null) as PerfilAtleta['sexo'],
      altura_cm: numero(c.altura_cm),
      ftp_w: numero(c.ftp_w),
      fc_max: numero(c.fc_max),
      fc_limiar: numero(c.fc_limiar),
      pace_limiar_seg_km: pace,
      css_seg_100m: css,
      peso_meta_kg: numero(c.peso_meta_kg),
      kcal_meta: numero(c.kcal_meta),
      proteina_meta_g: numero(c.proteina_meta_g),
      carbo_meta_g: numero(c.carbo_meta_g),
      gordura_meta_g: numero(c.gordura_meta_g),
    }
    if (Object.values(dados).some((v) => typeof v === 'number' && !Number.isFinite(v))) return toast.error('Algum número está inválido.')
    try {
      await salvar.mutateAsync(dados)
      toast.success('Perfil salvo. Os cálculos de carga já usam os novos valores.')
    } catch {
      // erro já exibido pelo hook (inclui valores fora da faixa aceita)
    }
  }

  const ftp = numero(c.ftp_w)
  const fcLimiar = numero(c.fc_limiar)
  const proteinaSugerida = pesoAtual ? [Math.round(pesoAtual * 1.6), Math.round(pesoAtual * 2)] : null
  const basal = taxaBasal({ ...(perfil as PerfilAtleta), sexo: (c.sexo || null) as PerfilAtleta['sexo'], altura_cm: numero(c.altura_cm), data_nascimento: c.data_nascimento || null }, pesoAtual)

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:gap-5" noValidate>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Usados no IMC e na estimativa de gasto calórico.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Campo id="nasc" rotulo="Data de nascimento">
            <Input id="nasc" type="date" value={c.data_nascimento} onChange={set('data_nascimento')} />
          </Campo>
          <Campo id="sexo" rotulo="Sexo">
            <NativeSelect id="sexo" value={c.sexo} onChange={set('sexo')}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </NativeSelect>
          </Campo>
          <Campo id="altura" rotulo="Altura (cm)">
            <Input id="altura" inputMode="decimal" placeholder="178" value={c.altura_cm} onChange={set('altura_cm')} />
          </Campo>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Limiares de treino</CardTitle>
          <CardDescription>Deixam a carga de cada treino precisa. Atualize depois de cada teste.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Campo id="ftp" rotulo="FTP (W)" dica="≈ 95% da potência média de um teste de 20 min.">
            <Input id="ftp" inputMode="numeric" placeholder="250" value={c.ftp_w} onChange={set('ftp_w')} />
          </Campo>
          <Campo id="fclim" rotulo="FC de limiar (bpm)" dica="Média dos últimos 20 min de um esforço forte de 30 min.">
            <Input id="fclim" inputMode="numeric" placeholder="165" value={c.fc_limiar} onChange={set('fc_limiar')} />
          </Campo>
          <Campo id="fcmax" rotulo="FC máxima (bpm)">
            <Input id="fcmax" inputMode="numeric" placeholder="188" value={c.fc_max} onChange={set('fc_max')} />
          </Campo>
          <Campo id="pace" rotulo="Pace de limiar na corrida (/km)" dica="Ritmo que você sustenta por ~1 hora (ex.: 4:40).">
            <Input id="pace" inputMode="numeric" placeholder="4:40" value={c.pace_limiar_seg_km} onChange={set('pace_limiar_seg_km')} />
          </Campo>
          <Campo id="css" rotulo="CSS na natação (/100 m)" dica="(tempo dos 400 m − tempo dos 200 m) ÷ 2.">
            <Input id="css" inputMode="numeric" placeholder="1:45" value={c.css_seg_100m} onChange={set('css_seg_100m')} />
          </Campo>
          {ftp && pesoAtual ? (
            <div className="bg-muted/50 grid content-center rounded-lg px-3 py-2">
              <span className="text-muted-foreground text-xs">Potência relativa</span>
              <span className="text-lg font-semibold">{(ftp / pesoAtual).toFixed(2).replace('.', ',')} W/kg</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Metas de peso e nutrição</CardTitle>
          <CardDescription>
            Aparecem no gráfico de peso e nas barras do dia na alimentação.
            {basal && <> Sua taxa basal estimada é de <strong className="text-foreground">{basal} kcal</strong>.</>}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Campo id="pesometa" rotulo="Peso meta (kg)">
            <Input id="pesometa" inputMode="decimal" placeholder="72" value={c.peso_meta_kg} onChange={set('peso_meta_kg')} />
          </Campo>
          <Campo id="kcal" rotulo="Calorias (kcal/dia)">
            <Input id="kcal" inputMode="numeric" placeholder="2600" value={c.kcal_meta} onChange={set('kcal_meta')} />
          </Campo>
          <Campo
            id="prot"
            rotulo="Proteína (g/dia)"
            dica={proteinaSugerida ? `Referência para atletas: ${proteinaSugerida[0]}–${proteinaSugerida[1]} g (1,6–2,0 g/kg).` : undefined}
          >
            <Input id="prot" inputMode="numeric" value={c.proteina_meta_g} onChange={set('proteina_meta_g')} />
          </Campo>
          <Campo id="carb" rotulo="Carboidrato (g/dia)">
            <Input id="carb" inputMode="numeric" value={c.carbo_meta_g} onChange={set('carbo_meta_g')} />
          </Campo>
          <Campo id="gord" rotulo="Gordura (g/dia)">
            <Input id="gord" inputMode="numeric" value={c.gordura_meta_g} onChange={set('gordura_meta_g')} />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Salvar perfil
        </Button>
      </div>

      {(fcLimiar || ftp) && (
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {fcLimiar ? (
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">Zonas de frequência cardíaca</CardTitle>
                <CardDescription>Por % da FC de limiar ({fcLimiar} bpm)</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm tabular-nums">
                  <tbody className="divide-y">
                    {ZONAS_FC.map(([nome, de, ate], i) => (
                      <tr key={nome}>
                        <td className="py-1.5">{nome}</td>
                        <td className="py-1.5 text-right font-medium">
                          {i === 0
                            ? `até ${Math.round(fcLimiar * ate) - 1}`
                            : i === ZONAS_FC.length - 1
                              ? `a partir de ${Math.round(fcLimiar * de)}`
                              : `${Math.round(fcLimiar * de)}–${Math.round(fcLimiar * ate) - 1}`}{' '}
                          bpm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
          {ftp ? (
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">Zonas de potência</CardTitle>
                <CardDescription>Por % do FTP ({ftp} W)</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm tabular-nums">
                  <tbody className="divide-y">
                    {ZONAS_POTENCIA.map(([nome, de, ate], i) => (
                      <tr key={nome}>
                        <td className="py-1.5">{nome}</td>
                        <td className="py-1.5 text-right font-medium">
                          {i === 0 ? `até ${Math.round(ftp * ate)}` : i === ZONAS_POTENCIA.length - 1 ? `acima de ${Math.round(ftp * de)}` : `${Math.round(ftp * de)}–${Math.round(ftp * ate)}`} W
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </form>
  )
}

export default function PerfilAtletaTriathlon() {
  const perfil = usePerfilAtleta()
  const pesagens = usePesagens()
  const pesoAtual = pesagens.data?.at(-1)?.peso_kg ?? null

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil do atleta</h1>
        <p className="text-muted-foreground text-sm">
          Limiares e metas usados nos cálculos{pesoAtual ? ` · peso atual: ${formatarDecimal(pesoAtual)} kg` : ''}.
        </p>
      </div>
      {perfil.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <FormPerfil key={perfil.data ? 'carregado' : 'vazio'} perfil={perfil.data} pesoAtual={pesoAtual} />
      )}
    </div>
  )
}
