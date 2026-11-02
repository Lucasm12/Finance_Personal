import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * No `npm run dev`, serve a função da Vercel api/ai-endurance.ts no mesmo endereço
 * (/api/ai-endurance), lendo AI_ENDURANCE_* do .env.local — sem expor nada ao navegador.
 */
function apiLocal(): Plugin {
  return {
    name: 'api-local',
    configureServer(server) {
      server.middlewares.use('/api/ai-endurance', async (req, res) => {
        try {
          const env = { ...process.env, ...loadEnv(server.config.mode, process.cwd(), '') }
          const modulo = await server.ssrLoadModule('/api/ai-endurance.ts')
          const cabecalhos = Object.entries(req.headers).flatMap(([k, v]): [string, string][] =>
            v === undefined ? [] : [[k, Array.isArray(v) ? v.join(', ') : v]],
          )
          const resposta: Response = await modulo.tratar(
            new Request(`http://${req.headers.host ?? 'localhost'}${req.originalUrl ?? req.url}`, { method: req.method, headers: cabecalhos }),
            env,
          )
          res.statusCode = resposta.status
          resposta.headers.forEach((valor, nome) => res.setHeader(nome, valor))
          res.end(Buffer.from(await resposta.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(`api/ai-endurance: ${e instanceof Error ? e.message : String(e)}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ erro: 'Erro na função local da AI Endurance (veja o terminal).' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiLocal()],
  // NEXT_PUBLIC_ permite usar as variáveis criadas pela integração Supabase da Vercel.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
