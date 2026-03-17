import { midiNoteToName } from '../../lib/noteUtils'

export interface HudState {
  playerHP: number
  maxPlayerHP: number
  currentWave: number
  totalWaves: number
  activeNotes: Set<number>
}

/**
 * Draw the heads-up display — HP bar, wave counter, detected note pill.
 */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: HudState,
): void {
  // HP bar (top-left)
  const hpRatio = state.playerHP / state.maxPlayerHP
  const hpBarW = 160
  const hpBarH = 14
  const hpBarX = 12
  const hpBarY = 12

  ctx.fillStyle = '#374151'
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH)

  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : '#ef4444'
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH)

  // Wave counter (top-right)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(
    `Wave ${state.currentWave + 1}/${state.totalWaves}`,
    width - 12,
    12,
  )

  // Detected note pill (bottom-left)
  const pillX = 12
  const pillY = height - 44
  const pillW = 80
  const pillH = 24

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(pillX, pillY, pillW, pillH)

  const noteDisplay =
    state.activeNotes.size > 0
      ? Array.from(state.activeNotes).map(midiNoteToName).join('+')
      : '---'

  ctx.fillStyle = '#ffffff'
  ctx.font = '13px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(noteDisplay, pillX + 6, pillY + pillH / 2)
}
