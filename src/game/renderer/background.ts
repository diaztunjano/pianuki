/**
 * Background renderer — dark fill, wrong-note flash, grid dots,
 * L-shape path with entry arrow and goal marker.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wrongNoteFlashFrames: number,
): void {
  const pathWidth = Math.max(48, width * 0.055)

  // Dark fill
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, width, height)

  // Wrong note flash overlay (drawn over background, before path)
  if (wrongNoteFlashFrames > 0) {
    ctx.fillStyle = `rgba(220, 38, 38, ${(wrongNoteFlashFrames / 8) * 0.3})`
    ctx.fillRect(0, 0, width, height)
  }

  // Subtle grid dots
  const gridSpacing = 40
  ctx.fillStyle = '#2a2a4a'
  for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
    for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
      ctx.beginPath()
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // L-shape path
  const startX = width * 0.35
  const elbowY = height * 0.62
  const endX = width * 0.82
  const halfW = pathWidth / 2

  ctx.fillStyle = '#2d3748'
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 2

  // Vertical segment
  ctx.beginPath()
  ctx.rect(startX - halfW, 0, pathWidth, elbowY + halfW)
  ctx.fill()
  ctx.stroke()

  // Horizontal segment
  ctx.beginPath()
  ctx.rect(startX - halfW, elbowY - halfW, endX - startX + halfW, pathWidth)
  ctx.fill()
  ctx.stroke()

  // Entry arrow at top
  ctx.fillStyle = '#4a5568'
  ctx.beginPath()
  ctx.moveTo(startX - 12, 8)
  ctx.lineTo(startX + 12, 8)
  ctx.lineTo(startX, 28)
  ctx.closePath()
  ctx.fill()

  // Goal marker at path end
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.arc(endX, elbowY, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a1a2e'
  ctx.font = `bold ${Math.max(10, pathWidth * 0.25)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', endX, elbowY)
}
