import { useEffect, useRef } from 'react'

interface Ponto {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const DISTANCIA_LINHA = 130
const DISTANCIA_MOUSE = 170
const RAIO_AFASTAR = 110

/**
 * Rede de pontos que flutuam devagar e se ligam por linhas finas.
 * Perto do cursor (ou do dedo), os pontos se afastam e se conectam a ele.
 * Com "reduzir movimento" ativado no sistema, desenha um quadro parado.
 */
export function FundoAnimado() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: 0, y: 0, ativo: false }
    let largura = 0
    let altura = 0
    let pontos: Ponto[] = []
    let quadro = 0

    function criarPonto(): Ponto {
      const angulo = Math.random() * Math.PI * 2
      const velocidade = 0.12 + Math.random() * 0.22
      return {
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        r: 0.7 + Math.random() * 1.1,
      }
    }

    function redimensionar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      largura = canvas!.clientWidth
      altura = canvas!.clientHeight
      canvas!.width = Math.round(largura * dpr)
      canvas!.height = Math.round(altura * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const quantidade = Math.max(28, Math.min(110, Math.round((largura * altura) / 14000)))
      pontos = Array.from({ length: quantidade }, criarPonto)
    }

    function mover(p: Ponto) {
      p.x += p.vx
      p.y += p.vy
      // atravessa as bordas
      if (p.x < -20) p.x = largura + 20
      if (p.x > largura + 20) p.x = -20
      if (p.y < -20) p.y = altura + 20
      if (p.y > altura + 20) p.y = -20
      // afasta-se suavemente do cursor
      if (mouse.ativo) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d = Math.hypot(dx, dy)
        if (d > 0 && d < RAIO_AFASTAR) {
          const forca = (1 - d / RAIO_AFASTAR) * 0.9
          p.x += (dx / d) * forca
          p.y += (dy / d) * forca
        }
      }
    }

    function desenhar() {
      ctx!.clearRect(0, 0, largura, altura)
      if (!reduzido) pontos.forEach(mover)

      ctx!.lineWidth = 1
      for (let i = 0; i < pontos.length; i++) {
        const a = pontos[i]
        for (let j = i + 1; j < pontos.length; j++) {
          const b = pontos[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < DISTANCIA_LINHA) {
            ctx!.strokeStyle = `rgba(255, 255, 255, ${(1 - d / DISTANCIA_LINHA) * 0.13})`
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }
      }

      for (const p of pontos) {
        let perto = 0
        if (mouse.ativo) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y)
          if (d < DISTANCIA_MOUSE) {
            perto = 1 - d / DISTANCIA_MOUSE
            ctx!.strokeStyle = `rgba(52, 211, 153, ${perto * 0.45})`
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(mouse.x, mouse.y)
            ctx!.stroke()
          }
        }
        ctx!.fillStyle = perto > 0 ? `rgba(110, 231, 183, ${0.45 + perto * 0.55})` : 'rgba(255, 255, 255, 0.45)'
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r + perto * 1.2, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function animar() {
      desenhar()
      quadro = requestAnimationFrame(animar)
    }

    function aoMoverPonteiro(e: PointerEvent) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.ativo = true
      if (reduzido) desenhar()
    }
    function aoSairPonteiro() {
      mouse.ativo = false
      if (reduzido) desenhar()
    }
    function aoRedimensionar() {
      redimensionar()
      if (reduzido) desenhar()
    }

    redimensionar()
    if (reduzido) desenhar()
    else animar()

    window.addEventListener('resize', aoRedimensionar)
    window.addEventListener('pointermove', aoMoverPonteiro)
    document.documentElement.addEventListener('pointerleave', aoSairPonteiro)
    window.addEventListener('blur', aoSairPonteiro)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', aoRedimensionar)
      window.removeEventListener('pointermove', aoMoverPonteiro)
      document.documentElement.removeEventListener('pointerleave', aoSairPonteiro)
      window.removeEventListener('blur', aoSairPonteiro)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
}
