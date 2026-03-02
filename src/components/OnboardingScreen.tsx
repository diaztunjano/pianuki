import { useBoundStore } from '../stores'

// --- OnboardingScreen ---

/**
 * Full-screen gate shown to first-time users before any gameplay is visible.
 * Explains the headphone requirement and gives context on what Pianuki is.
 *
 * On continue: marks hasSeenOnboarding = true (persisted) and navigates to levelSelect.
 * AppShell renders this instead of any other screen when hasSeenOnboarding is false.
 */
export function OnboardingScreen() {
  const markOnboardingSeen = useBoundStore((s) => s.markOnboardingSeen)
  const navigateTo = useBoundStore((s) => s.navigateTo)

  const handleContinue = () => {
    markOnboardingSeen()
    navigateTo('levelSelect')
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-950 overflow-hidden">
      <div className="rounded-2xl bg-gray-900/90 border border-white/10 px-12 py-10 shadow-2xl backdrop-blur-sm max-w-lg w-full mx-4 flex flex-col items-center gap-6">
        {/* Game title */}
        <h1 className="text-5xl font-bold tracking-widest text-white uppercase">
          PIANUKI
        </h1>

        {/* Tagline */}
        <p className="text-gray-400 text-center text-base leading-relaxed">
          A tower defense game you play on your real piano.
          Defeat enemies by playing the notes displayed on screen
          before they reach your base.
        </p>

        {/* Headphone requirement section */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Headphone icon */}
          <span className="text-5xl" role="img" aria-label="headphones">
            &#127911;
          </span>

          <h2 className="text-lg font-semibold tracking-widest uppercase text-white">
            Headphones Required
          </h2>

          <p className="text-gray-400 text-center text-sm leading-relaxed">
            This game listens to your piano through your device&apos;s microphone.
            Headphones are required to prevent the game&apos;s audio from being
            picked up by the mic, which causes false note detections.
          </p>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="rounded-xl bg-white/10 border border-white/20 px-8 py-3 text-lg font-semibold text-white hover:bg-white/20 active:scale-95 transition-all w-full mt-2"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
