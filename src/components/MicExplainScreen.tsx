// --- MicExplainScreen ---

/**
 * Overlay shown before the browser microphone permission prompt.
 * Explains WHY the game needs microphone access and provides privacy reassurance.
 *
 * This is NOT a full currentScreen — it's an overlay component rendered
 * within the game screen area when micPermission is 'prompt' and the user
 * hasn't yet acknowledged the explanation.
 *
 * Props:
 *   onContinue — called when user clicks "Allow Microphone".
 *                After this, AppShell shows the actual "Click to Enable Microphone" button,
 *                which triggers getUserMedia via useAudioInput when clicked.
 */
interface MicExplainScreenProps {
  onContinue: () => void
}

export function MicExplainScreen({ onContinue }: MicExplainScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
      <div className="rounded-2xl bg-gray-900/90 border border-white/10 px-12 py-10 shadow-2xl backdrop-blur-sm max-w-lg w-full mx-4 flex flex-col items-center gap-6">
        {/* Microphone icon */}
        <span className="text-5xl" role="img" aria-label="microphone">
          &#127908;
        </span>

        {/* Title */}
        <h2 className="text-xl font-bold tracking-widest uppercase text-white">
          Microphone Access
        </h2>

        {/* Main explanation */}
        <p className="text-gray-400 text-center text-sm leading-relaxed">
          Pianuki needs access to your microphone to hear the notes you play on
          your piano. This is how the game detects which notes you&apos;re playing.
        </p>

        {/* Privacy reassurance */}
        <p className="text-gray-500 text-center text-xs leading-relaxed border border-white/10 rounded-xl px-4 py-3 bg-white/5 w-full">
          Your audio is processed entirely in your browser.
          Nothing is recorded or sent anywhere.
        </p>

        {/* Continue button */}
        <button
          onClick={onContinue}
          className="rounded-xl bg-white/10 border border-white/20 px-8 py-3 text-lg font-semibold text-white hover:bg-white/20 active:scale-95 transition-all w-full"
        >
          Allow Microphone
        </button>
      </div>
    </div>
  )
}
