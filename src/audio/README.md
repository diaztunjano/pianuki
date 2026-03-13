# Audio / SFX Manager

Sound effects system for Pianuki using Web Audio API synthesis.

## Usage

### Basic Usage

```typescript
import {
  playCorrect,
  playWrong,
  playEnemyDeath,
  playWaveStart,
  playWaveEnd,
  playGameOver
} from './audio/sfxManager'

// Play individual sounds
playCorrect()        // Correct note chime (major triad arpeggio)
playWrong()          // Wrong note buzz (dissonant sawtooth)
playEnemyDeath()     // Enemy defeated (descending glitch)
playWaveStart()      // Wave starting (ascending alert)
playWaveEnd()        // Wave completed (major chord fanfare)
playGameOver()       // Game over (minor chord)
```

### Reusing AudioContext

If you already have an AudioContext (e.g., from mic input), you can share it:

```typescript
import { setSharedAudioContext } from './audio/sfxManager'

// In useAudioInput.ts, after creating the AudioContext:
const audioContext = new AudioContext()
setSharedAudioContext(audioContext)
```

This avoids creating multiple AudioContext instances and works around browser limitations.

### Generic Dispatcher

```typescript
import { playSFX } from './audio/sfxManager'

playSFX('correct')
playSFX('wrong')
playSFX('enemyDeath')
playSFX('waveStart')
playSFX('waveEnd')
playSFX('gameOver')
```

## Sound Design

All sounds are synthesized procedurally:

- **Correct**: C5 major triad arpeggio (523.25, 659.25, 783.99 Hz) - bright, positive
- **Wrong**: A2 sawtooth with vibrato (110 Hz ±15 Hz) - dissonant, harsh
- **Enemy Death**: Square wave pitch drop 400→100 Hz - descending glitch
- **Wave Start**: Triangle wave ascending 300→600 Hz - alert, rising
- **Wave End**: G major chord (392, 493.88, 587.33 Hz) - triumphant fanfare
- **Game Over**: A minor chord (220, 261.63, 329.63 Hz) - somber, final

## Implementation Details

- **No external files**: All sounds use OscillatorNode + GainNode
- **Lazy AudioContext**: Created on first play (respects user gesture requirement)
- **Fire-and-forget**: No cleanup required by caller
- **Reusable**: Can share AudioContext with mic input pipeline

## Testing

Open `sfxManager.test.html` in a browser to test all sounds interactively.
