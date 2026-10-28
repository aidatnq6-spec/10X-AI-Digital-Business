/** Vẽ một hành tinh có dải mây trôi. Dùng chung cho vũ trụ và màn hình đề bài. */
export function drawSphere(c: CanvasRenderingContext2D, x: number, y: number, r: number, c0: string, c1: string, t: number) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  g.addColorStop(0, c0)
  g.addColorStop(1, c1)
  c.fillStyle = g
  c.beginPath()
  c.arc(x, y, r, 0, 7)
  c.fill()
  c.save()
  c.beginPath()
  c.arc(x, y, r, 0, 7)
  c.clip()
  c.globalAlpha = 0.22
  c.fillStyle = '#fff'
  for (let k = 0; k < 4; k++) {
    const ox = ((t * 0.012 * (1 + k * 0.3) + k * 37) % (r * 3)) - r * 1.5
    c.beginPath()
    c.ellipse(x + ox, y + (k - 1.5) * r * 0.35, r * 0.7, r * 0.12, 0, 0, 7)
    c.fill()
  }
  c.restore()
  const sh = c.createRadialGradient(x + r * 0.5, y + r * 0.4, r * 0.2, x, y, r * 1.05)
  sh.addColorStop(0, 'rgba(0,0,0,0)')
  sh.addColorStop(1, 'rgba(0,0,0,.55)')
  c.fillStyle = sh
  c.beginPath()
  c.arc(x, y, r, 0, 7)
  c.fill()
}
