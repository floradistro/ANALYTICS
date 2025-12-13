'use client'

import { useEffect, useRef } from 'react'

interface MatrixRainProps {
  opacity?: number
  speed?: number
  density?: number
}

export default function MatrixRain({ opacity = 0.15, speed = 1, density = 0.95 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Matrix characters - mix of katakana, numbers, and symbols
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$¥€£₿∞∑∏√∫≈≠≤≥÷×±'
    const charArray = chars.split('')

    // Column settings
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)

    // Track the y position of each column
    const drops: number[] = Array(columns).fill(1)

    // Track character for each position (for persistence effect)
    const charMatrix: string[][] = Array(columns).fill(null).map(() => [])

    // Brightness for each drop (creates the "head" glow effect)
    const brightness: number[] = Array(columns).fill(1)

    // Speed variation for each column (speed prop is a multiplier)
    const speeds: number[] = Array(columns).fill(0).map(() => (0.3 + Math.random() * 0.7) * speed)

    // Draw function
    const draw = () => {
      // Semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px "Courier New", monospace`

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)]

        // Calculate y position
        const y = drops[i] * fontSize

        // Store character in matrix
        const row = Math.floor(drops[i])
        if (!charMatrix[i]) charMatrix[i] = []
        charMatrix[i][row] = char

        // Draw the "head" of the drop (brightest)
        const headGlow = brightness[i]
        ctx.fillStyle = `rgba(0, 255, 65, ${headGlow * opacity * 2})`
        ctx.shadowColor = '#00ff41'
        ctx.shadowBlur = 10
        ctx.fillText(char, i * fontSize, y)

        // Draw a few characters behind the head with fading brightness
        ctx.shadowBlur = 0
        for (let j = 1; j < 20; j++) {
          const prevRow = row - j
          if (prevRow >= 0 && charMatrix[i][prevRow]) {
            const fadeOpacity = Math.max(0, (1 - j / 20) * opacity)
            // Green gradient from bright to dark
            const green = Math.floor(255 - (j * 8))
            ctx.fillStyle = `rgba(0, ${green}, ${Math.floor(green * 0.25)}, ${fadeOpacity})`
            ctx.fillText(charMatrix[i][prevRow], i * fontSize, prevRow * fontSize)
          }
        }

        // Move drop down
        drops[i] += speeds[i]

        // Reset drop to top with random chance
        if (drops[i] * fontSize > canvas.height && Math.random() > density) {
          drops[i] = 0
          brightness[i] = 0.5 + Math.random() * 0.5
          speeds[i] = (0.3 + Math.random() * 0.7) * speed
          charMatrix[i] = [] // Clear column history
        }
      }
    }

    // Animation loop
    let animationId: number
    const animate = () => {
      draw()
      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [opacity, speed, density])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'black' }}
    />
  )
}
