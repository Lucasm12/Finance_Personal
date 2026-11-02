/**
 * Função da Vercel que fala com a AI Endurance: exige sessão válida, usa o atleta do banco
 * (nunca o da URL), não vaza a chave de parceiro e traduz os erros da API.
 */
import { describe, expect, it, vi } from 'vitest'

import { tratar } from '../../api/ai-endurance'

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.token-do-usuario.assinatura'
const ENV = {
  VITE_SUPABASE_URL: 'https://projeto.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'chave-anon',
  AI_ENDURANCE_PARTNER_ID: 'parceiro-7',
  AI_ENDURANCE_API_KEY: 'segredo-do-parceiro',
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const pedido = (query: string, init: RequestInit = {}) =>
  new Request(`https://app.exemplo.com/api/ai-endurance?${query}`, { headers: { Authorization: `Bearer ${TOKEN}` }, ...init })

/** fetch simulado: Supabase devolve o atleta; AI Endurance responde conforme `aie`. */
function simular(atleta: unknown, aie: (url: URL) => Response | Promise<Response> = () => json([])) {
  return vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(String(entrada))
    if (url.hostname === 'projeto.supabase.co') return json(atleta)
    return aie(url)
  })
}

const corpo = async (r: Response) => (await r.json()) as Record<string, unknown>

describe('autenticação e configuração', () => {
  it('sem token: 401 e nem chega a consultar nada', async () => {
    const buscar = simular('12345')
    const r = await tratar(new Request('https://app.exemplo.com/api/ai-endurance?acao=status'), ENV, buscar)
    expect(r.status).toBe(401)
    expect(buscar).not.toHaveBeenCalled()
  })

  it('ação desconhecida: 400; método diferente de GET: 405', async () => {
    expect((await tratar(pedido('acao=apagar'), ENV, simular('1'))).status).toBe(400)
    expect((await tratar(pedido('acao=status', { method: 'POST' }), ENV, simular('1'))).status).toBe(405)
  })

  it('valida o token no Supabase (com o próprio token) e informa o status', async () => {
    const buscar = simular('12345')
    const r = await tratar(pedido('acao=status'), ENV, buscar)
    expect(await corpo(r)).toEqual({ configurado: true, vinculado: true })
    const [url, init] = buscar.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://projeto.supabase.co/rest/v1/rpc/ai_endurance_atleta')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('token inválido para o Supabase: 401', async () => {
    const buscar = vi.fn(async () => json({ message: 'JWT expired' }, 401))
    expect((await tratar(pedido('acao=status'), ENV, buscar)).status).toBe(401)
  })

  it('sem as variáveis da AI Endurance: status avisa; buscar dados dá 503', async () => {
    const env = { ...ENV, AI_ENDURANCE_API_KEY: undefined }
    expect(await corpo(await tratar(pedido('acao=status'), env, simular('12345')))).toEqual({ configurado: false, vinculado: true })
    const r = await tratar(pedido('acao=atividades&modalidade=corrida'), env, simular('12345'))
    expect(r.status).toBe(503)
  })

  it('usuário sem atleta vinculado: 403', async () => {
    const r = await tratar(pedido('acao=atividades&modalidade=corrida'), ENV, simular(null))
    expect(r.status).toBe(403)
    expect(String((await corpo(r)).erro)).toMatch(/vinculada/)
  })
})

describe('atividades', () => {
  it('consulta o atleta do banco — ignora ?user= da URL — com as credenciais de parceiro', async () => {
    const buscar = simular('12345', () => json({ count: 1, next: 'https://aiendurance.xyz/api/x/?page=2', results: [{ id: 1 }] }))
    const r = await tratar(pedido('acao=atividades&modalidade=natacao&user=999&pagina=2'), ENV, buscar)
    expect(await corpo(r)).toEqual({ resultados: [{ id: 1 }], proxima: true })
    const [url, init] = buscar.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://aiendurance.xyz/api/swimming_activity_detail_partner/?user=12345&page=2')
    expect(init.headers).toMatchObject({ 'PARTNER-ID': 'parceiro-7', Authorization: 'Bearer segredo-do-parceiro' })
  })

  it('a chave de parceiro nunca aparece na resposta, nem em erro', async () => {
    const buscar = simular('12345', () => json({ detail: 'Invalid token segredo-do-parceiro' }, 401))
    const r = await tratar(pedido('acao=atividades&modalidade=corrida'), ENV, buscar)
    const texto = await r.text()
    expect(r.status).toBe(502)
    expect(texto).toMatch(/recusou as credenciais/)
    expect(texto).not.toMatch(/segredo/)
  })

  it('modalidade ou página inválida: 400', async () => {
    expect((await tratar(pedido('acao=atividades&modalidade=remo'), ENV, simular('1'))).status).toBe(400)
    expect((await tratar(pedido('acao=atividades&modalidade=corrida&pagina=-1'), ENV, simular('1'))).status).toBe(400)
  })

  it.each([
    [429, 429, /Limite de consultas/],
    [404, 404, /não encontrou/],
    [503, 502, /fora do ar/],
  ])('AI Endurance responde %i → %i com mensagem clara', async (status, esperado, mensagem) => {
    const r = await tratar(pedido('acao=atividades&modalidade=corrida'), ENV, simular('12345', () => json({}, status)))
    expect(r.status).toBe(esperado)
    expect(String((await corpo(r)).erro)).toMatch(mensagem)
  })

  it('demora demais: 504; resposta que não é JSON: 502', async () => {
    const lento = simular('12345', () => {
      throw new DOMException('expirou', 'TimeoutError')
    })
    expect((await tratar(pedido('acao=atividades&modalidade=corrida'), ENV, lento)).status).toBe(504)
    const html = simular('12345', () => new Response('<html>erro</html>', { status: 200 }))
    const r = await tratar(pedido('acao=atividades&modalidade=corrida'), ENV, html)
    expect(r.status).toBe(502)
    expect(String((await corpo(r)).erro)).toMatch(/não é JSON/)
  })
})

describe('treinos do plano', () => {
  it('pega o plano mais recente, os treinos futuros dele e só as zonas/.zwo do atleta', async () => {
    const buscar = simular('12345', (url) => {
      if (url.pathname.endsWith('/training_plan_partner/')) return json({ results: [{ id: 7 }, { id: 31 }, { id: 12 }] })
      if (url.pathname.endsWith('/usercore_partner/')) return json([{ id: 12345, user_name: 'Lucas', weight_kg: 80, zones: { Ride: { Endurance: 230 } }, zwift_zip: 'UEsDB' }])
      if (url.pathname.endsWith('/future_workout_static_partner/')) return json([{ future_workout_static_id: 1, steps: {} }])
      return json({}, 404)
    })
    const r = await corpo(await tratar(pedido('acao=treinos'), ENV, buscar))
    expect(buscar.mock.calls.map(([u]) => String(u))).toContain('https://aiendurance.xyz/api/future_workout_static_partner/?plan=31')
    expect(r.plano).toEqual({ id: '31' })
    expect(r.treinos).toEqual([{ future_workout_static_id: 1, steps: {} }])
    // dados pessoais do perfil na AI Endurance não são repassados
    expect(r.atleta).toEqual({ zones: { Ride: { Endurance: 230 } }, critical_swim_speed: null, zwift_zip: 'UEsDB' })
  })

  it('sem plano ainda: lista vazia', async () => {
    const buscar = simular('12345', (url) => (url.pathname.endsWith('/training_plan_partner/') ? json([]) : json([])))
    expect(await corpo(await tratar(pedido('acao=treinos'), ENV, buscar))).toMatchObject({ plano: null, treinos: [] })
  })
})
