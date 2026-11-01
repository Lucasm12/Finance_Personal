import { LoaderCircleIcon } from 'lucide-react'

export function Carregando() {
  return (
    <div className="text-muted-foreground flex min-h-[50dvh] items-center justify-center gap-2" role="status">
      <LoaderCircleIcon className="size-5 animate-spin" />
      Carregando…
    </div>
  )
}
