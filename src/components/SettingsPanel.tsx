import { useBoundStore } from '../stores'

/**
 * SettingsPanel — modal overlay for configuring penalty mode and input source.
 *
 * Positioned at z-25 so it sits above GameOverlay (z-20) but below the
 * mic enable overlay (z-30).
 *
 * Props:
 *   onClose — called when the user clicks "Done"
 */
interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const penaltyMode = useBoundStore((s) => s.settings.penaltyMode)
  const inputSource = useBoundStore((s) => s.settings.inputSource)
  const setPenaltyMode = useBoundStore((s) => s.setPenaltyMode)
  const setInputSource = useBoundStore((s) => s.setInputSource)

  const cardClass =
    'flex flex-col gap-8 rounded-2xl bg-gray-900/90 border border-white/10 px-12 py-10 text-white shadow-2xl backdrop-blur-sm w-full max-w-md'

  const activeBtnClass =
    'flex-1 rounded-xl bg-white/20 border border-white/40 px-4 py-3 text-sm font-semibold transition-all'

  const inactiveBtnClass =
    'flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-white/60 hover:bg-white/10 transition-all'

  const primaryBtnClass =
    'rounded-xl bg-white/10 border border-white/20 px-8 py-3 text-lg font-semibold hover:bg-white/20 active:scale-95 transition-all'

  const PENALTY_OPTIONS: Array<{
    value: 'easy' | 'normal' | 'hard'
    label: string
    description: string
  }> = [
    { value: 'easy', label: 'Easy', description: 'No penalty for missed enemies' },
    { value: 'normal', label: 'Normal', description: 'Enemies deal damage' },
    { value: 'hard', label: 'Hard', description: 'Enemies loop back' },
  ]

  const INPUT_OPTIONS: Array<{
    value: 'mic' | 'midi'
    label: string
  }> = [
    { value: 'mic', label: 'Microphone' },
    { value: 'midi', label: 'MIDI' },
  ]

  const activeDescription = PENALTY_OPTIONS.find((o) => o.value === penaltyMode)?.description ?? ''

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-25">
      <div className={cardClass}>
        {/* Title */}
        <h2 className="text-2xl font-bold tracking-widest text-center">SETTINGS</h2>

        {/* Difficulty / Penalty Mode */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-white/70 tracking-wider uppercase">
            Difficulty
          </label>
          <div className="flex gap-2">
            {PENALTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={penaltyMode === option.value ? activeBtnClass : inactiveBtnClass}
                onClick={() => setPenaltyMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50 h-4">{activeDescription}</p>
        </div>

        {/* Input Source */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-white/70 tracking-wider uppercase">
            Input Source
          </label>
          <div className="flex gap-2">
            {INPUT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={inputSource === option.value ? activeBtnClass : inactiveBtnClass}
                onClick={() => setInputSource(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {inputSource === 'mic' && (
            <p className="text-xs text-white/40">
              Microphone access requires enabling after switching to game screen.
            </p>
          )}
        </div>

        {/* Close */}
        <div className="flex justify-center">
          <button className={primaryBtnClass} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
