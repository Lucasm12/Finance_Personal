/**
 * Importa a Bíblia completa para o Supabase — rode UMA vez, depois da migração do módulo Pessoal.
 *
 *   npm run seed:biblia                          baixa o módulo e grava no banco
 *   npm run seed:biblia -- --verificar           só baixa e confere (não grava nada)
 *   npm run seed:biblia -- --arquivo modulo.zip  usa um .zip já baixado
 *
 * Texto: "Biblia Sagrada traduzida em portuguez por João Ferreira d'Almeida" (reimpressão de 1911
 * da edição de 1900) — domínio público, em grafia da época. Módulo PorAlmeida1911 do CrossWire.
 *
 * Variáveis (no terminal; NUNCA no .env com prefixo VITE_ nem na Vercel):
 *   SUPABASE_URL               (ou VITE_SUPABASE_URL do .env.local, que o npm script já carrega)
 *   SUPABASE_SERVICE_ROLE_KEY  chave secreta: Supabase → Project Settings → API Keys
 * O app só lê o texto; gravar exige a chave secreta, que fica só no seu computador.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { createClient } from '@supabase/supabase-js'

import { arquivosDoZip, conferir, idVersiculo, lerModulo } from './biblia/sword.mjs'

const MODULO_URL = 'https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/PorAlmeida1911.zip'
const LOTE = 1000

const args = process.argv.slice(2)
const soVerificar = args.includes('--verificar')
const arquivo = args.includes('--arquivo') ? args[args.indexOf('--arquivo') + 1] : null

function sair(mensagem) {
  console.error(`\n✖ ${mensagem}\n`)
  process.exit(1)
}

/** Aceita só a chave secreta (service_role ou sb_secret_). Nunca mostra a chave. */
function conferirChave(chave) {
  if (!chave) sair('Defina SUPABASE_SERVICE_ROLE_KEY no terminal (veja o README, seção "Bíblia").')
  if (chave.startsWith('sb_secret_')) return
  if (chave.startsWith('sb_publishable_')) sair('Essa é a chave pública. O seed precisa da chave secreta (service_role / sb_secret_).')
  try {
    const papel = JSON.parse(Buffer.from(chave.split('.')[1], 'base64url').toString('utf8')).role
    if (papel !== 'service_role') sair(`Essa chave é do papel "${papel}". O seed precisa da chave service_role.`)
  } catch {
    sair('SUPABASE_SERVICE_ROLE_KEY não parece uma chave do Supabase.')
  }
}

async function baixarModulo() {
  if (arquivo) {
    console.log(`Lendo ${arquivo}…`)
    return readFile(arquivo)
  }
  console.log(`Baixando o módulo da Bíblia (≈1,5 MB)…\n  ${MODULO_URL}`)
  const resposta = await fetch(MODULO_URL, { signal: AbortSignal.timeout(120_000) })
  if (!resposta.ok) sair(`Não foi possível baixar o módulo (HTTP ${resposta.status}). Baixe o .zip pelo navegador e use --arquivo.`)
  return Buffer.from(await resposta.arrayBuffer())
}

async function principal() {
  const zip = await baixarModulo()
  console.log(`  SHA-256: ${createHash('sha256').update(zip).digest('hex')}`)

  const versiculos = lerModulo(arquivosDoZip(zip))
  const problemas = conferir(versiculos)
  if (problemas.length) sair(`O texto lido está incompleto: ${problemas.join('; ')}.`)
  console.log(`✔ Texto conferido: 66 livros, 1.189 capítulos, ${versiculos.length.toLocaleString('pt-BR')} versículos.`)
  console.log(`  Gênesis 1:1 — ${versiculos[0].texto}`)

  if (soVerificar) {
    console.log('\n(--verificar: nada foi gravado.)')
    return
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!url) sair('Defina SUPABASE_URL (ou VITE_SUPABASE_URL no .env.local).')
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  conferirChave(chave)
  const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })

  const livros = await supabase.from('biblia_livros').select('id', { count: 'exact', head: true })
  if (livros.error || livros.count !== 66) {
    sair('A tabela biblia_livros não está pronta. Rode antes a migração 20261102120000_pessoal.sql no SQL Editor.')
  }

  const linhas = versiculos.map((v) => ({ id: idVersiculo(v), livro_id: v.livro, capitulo: v.capitulo, versiculo: v.versiculo, texto: v.texto }))
  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE)
    for (let tentativa = 1; ; tentativa++) {
      // upsert: rodar de novo não duplica nada e mantém os ids (versículos marcados continuam valendo)
      const { error } = await supabase.from('biblia_versiculos').upsert(lote, { onConflict: 'id' })
      if (!error) break
      if (tentativa === 3) sair(`Falha ao gravar o lote ${i / LOTE + 1}: ${error.message}`)
      await new Promise((r) => setTimeout(r, 2000 * tentativa))
    }
    process.stdout.write(`\r  Gravando… ${Math.min(i + LOTE, linhas.length).toLocaleString('pt-BR')} de ${linhas.length.toLocaleString('pt-BR')}`)
  }

  const total = await supabase.from('biblia_versiculos').select('id', { count: 'exact', head: true })
  console.log(`\n✔ Pronto: ${total.count?.toLocaleString('pt-BR')} versículos no banco. Não precisa rodar de novo.`)
}

principal().catch((e) => sair(e instanceof Error ? e.message : String(e)))
