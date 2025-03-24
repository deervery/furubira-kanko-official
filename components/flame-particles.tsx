"use client"

import { useRef, useEffect } from "react"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  life: number
  maxLife: number
  size: number
  color: string
}

function FlameParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // パーティクルの配列を useRef で管理（再描画で再生成されないように）
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let lastTime = performance.now()

    // キャンバスのサイズを常にウィンドウいっぱいに調整
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // マウス移動時に発生位置にパーティクルを生成
    const mouseMoveHandler = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      // 例として、毎回 5 個のパーティクルを生成
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * 2 * Math.PI
        const speed = Math.random() * 1 + 0.5
        const life = Math.random() * 0.5 + 0.5 // 寿命（秒）
        // 炎パーティクルの色を赤系に統一
        const particle: Particle = {
          x: mouseX,
          y: mouseY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          life: 0,
          maxLife: life,
          size: Math.random() * 3 + 2,
          color: Math.random() > 0.9 ? "#ffcc00" : Math.random() > 0.3 ? "#ff6600" : "#cc0000",
        }
        particlesRef.current.push(particle)
      }
    }

    window.addEventListener("mousemove", mouseMoveHandler)

    // 各フレームごとにパーティクルの位置や透明度を更新
    const update = (deltaTime: number) => {
      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life += deltaTime / 1000 // 経過秒数に換算
        // 寿命に応じて透明度を減衰
        p.alpha = Math.max(0, 1 - p.life / p.maxLife)
        // 寿命を超えたパーティクルは配列から削除
        if (p.life >= p.maxLife) {
          particles.splice(i, 1)
        }
      }
    }

    // パーティクルをキャンバスに描画
    const draw = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.alpha
        // 中心から外側に向かって透明になるグラデーションを作成
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, p.color)
        gradient.addColorStop(1, "transparent")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    // アニメーションループ（requestAnimationFrame で実行）
    const animate = () => {
      const now = performance.now()
      const deltaTime = now - lastTime
      lastTime = now
      update(deltaTime)
      draw()
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // クリーンアップ処理
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", mouseMoveHandler)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none", // ユーザー操作に影響しないように
        width: "100%",
        height: "100%",
        zIndex: 9999, // 他のコンテンツよりも前面に表示
      }}
    />
  )
}

export default FlameParticles

