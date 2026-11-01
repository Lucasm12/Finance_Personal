import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Exibida quando as variáveis do Supabase não foram configuradas. */
export default function ConfiguracaoAusente() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Configuração do Supabase ausente</CardTitle>
          <CardDescription>O app não encontrou as variáveis de conexão com o banco de dados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Defina as variáveis abaixo e gere o build novamente:</p>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
            {`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica`}
          </pre>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            <li>
              <strong>No computador:</strong> crie o arquivo <code>.env.local</code> na raiz do projeto.
            </li>
            <li>
              <strong>Na Vercel:</strong> Settings → Environment Variables, depois faça um novo deploy.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
