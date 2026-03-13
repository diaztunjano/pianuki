# Integration Examples

## Example 1: Sharing AudioContext with Mic Input

Modify `src/hooks/useAudioInput.ts` to share its AudioContext:

```typescript
import { setSharedAudioContext } from '../audio/sfxManager'

// Inside the setup() function, after creating AudioContext:
audioContext = new AudioContext()
setSharedAudioContext(audioContext) // Share with SFX manager

// Rest of the setup code...
```

This allows the SFX manager to reuse the same AudioContext, avoiding browser limitations on concurrent contexts.

## Example 2: Playing Sounds on Game Events

### Correct Note Hit

In the game loop where you detect a correct note match:

```typescript
import { playCorrect } from '../audio/sfxManager'

// When player plays the correct note
if (noteMatchesEnemy(activeNote, enemy)) {
  damageEnemy(enemy.id, 1)
  playCorrect() // Play success chime
}
```

### Wrong Note

```typescript
import { playWrong } from '../audio/sfxManager'

// When player plays a wrong note
if (activeNote && !matchesAnyEnemy(activeNote)) {
  triggerWrongNote() // Existing flash effect
  playWrong() // Play buzz sound
}
```

### Enemy Death

In `src/stores/audioStore.ts`, modify the `damageEnemy` action:

```typescript
import { playEnemyDeath } from '../audio/sfxManager'

damageEnemy: (id, damage) =>
  set(
    (draft) => {
      const enemy = draft.enemies.find((e: Enemy) => e.id === id)
      if (!enemy) return
      enemy.hp -= damage
      if (enemy.hp <= 0) {
        enemy.state = 'dying'
        enemy.defeatedFrames = 12
        playEnemyDeath() // Play death sound
      }
    },
    false,
    'game/damageEnemy',
  ),
```

### Wave Start

In `src/stores/audioStore.ts`, modify the `startGame` or `advanceWave` action:

```typescript
import { playWaveStart } from '../audio/sfxManager'

startGame: (levelIndex) => {
  resetStats()
  set(
    (draft) => {
      // ... existing code ...
      playWaveStart() // Play wave start sound
    },
    false,
    'game/startGame',
  )
},
```

### Wave End

```typescript
import { playWaveEnd } from '../audio/sfxManager'

advanceWave: () =>
  set(
    (draft) => {
      const level = LEVEL_CONFIGS[draft.currentLevel]
      if (!level) return
      const nextWaveIndex = draft.currentWave + 1

      playWaveEnd() // Play completion sound

      if (nextWaveIndex < level.waves.length) {
        // Continue to next wave
        // ...
      } else {
        // Level complete
        draft.gamePhase = 'level-complete'
      }
    },
    false,
    'game/advanceWave',
  ),
```

### Game Over

```typescript
import { playGameOver } from '../audio/sfxManager'

enemyReachedGoal: (id) =>
  set(
    (draft) => {
      const enemy = draft.enemies.find((e: Enemy) => e.id === id)
      if (enemy) {
        enemy.state = 'dead'
      }
      draft.playerHP -= 1
      if (draft.playerHP <= 0) {
        draft.gamePhase = 'gameover'
        playGameOver() // Play game over sound
      }
    },
    false,
    'game/enemyReachedGoal',
  ),
```

## Example 3: Settings Integration (for v2 mute control)

Future settings slice could add SFX mute control:

```typescript
interface SettingsSlice {
  settings: {
    // ... existing settings ...
    sfxMuted: boolean
  }
  toggleSFX: () => void
}

// Wrapper functions that check mute state
export function playCorrectIfEnabled() {
  if (!useBoundStore.getState().settings.sfxMuted) {
    playCorrect()
  }
}
```

But for v1, just use the functions directly - mute control can be added later.
