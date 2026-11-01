import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTema } from '@/hooks/useTema'

const Toaster = ({ ...props }: ToasterProps) => {
  const { escuro } = useTema()

  return (
    <Sonner
      theme={escuro ? 'dark' : 'light'}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
