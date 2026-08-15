import { useGameContext } from '../../state/useGameContext'
import { useGameSnapshot } from '../../state/useGameSnapshot'
import { LargeNumber } from '../../core/numbers/LargeNumber'

interface TutorialStep {
  flag: string
  title: string
  message: string
  shopHint?: boolean
  condition: (snap: ReturnType<typeof useGameSnapshot>) => boolean
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    flag: 'core',
    title: 'Welcome to Poop Clicker',
    message: 'Tap the poop to earn PP (Poop Points)!',
    condition: (snap) => !snap.save.tutorialFlags.core,
  },
  {
    flag: 'generators',
    title: 'Buy Generators',
    message: 'Open Shop and buy a Plunger Intern to earn PP automatically.',
    shopHint: true,
    condition: (snap) => {
      if (!snap.save.tutorialFlags.core || snap.save.tutorialFlags.generators) return false
      if (Object.values(snap.save.generators).some((n) => n > 0)) return false
      return LargeNumber.deserialize(snap.save.currentPP).gte(15)
    },
  },
  {
    flag: 'flush',
    title: 'Time to Flush',
    message: 'Flush converts your run into Flush Power for permanent upgrades!',
    condition: (snap) => {
      if (!snap.save.tutorialFlags.generators || snap.save.tutorialFlags.flush) return false
      return snap.canFlush
    },
  },
  {
    flag: 'daily',
    title: 'Daily Challenges',
    message: 'Complete daily challenges and the Daily Dump minigame for rewards.',
    condition: (snap) => snap.save.tutorialFlags.flush && !snap.save.tutorialFlags.daily,
  },
  {
    flag: 'collection',
    title: 'Customize Your Poop',
    message: 'Unlock and equip unique skins in the Collection tab.',
    condition: (snap) => snap.save.tutorialFlags.daily && !snap.save.tutorialFlags.collection,
  },
]

export interface TutorialOverlayProps {
  onGoToShop?: () => void
}

export function TutorialOverlay({ onGoToShop }: TutorialOverlayProps) {
  const { engine } = useGameContext()
  const snap = useGameSnapshot()

  const currentStep = TUTORIAL_STEPS.find((step) => step.condition(snap))

  if (!currentStep) return null

  return (
    <div
      className={`modal-backdrop modal-layer-tutorial tutorial-pass-through`}
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-label={currentStep.title}
    >
      <div className="modal tutorial-card">
        <h2>{currentStep.title}</h2>
        <p>{currentStep.message}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {currentStep.shopHint && (
            <button
              className="primary-btn"
              onClick={() => {
                onGoToShop?.()
              }}
            >
              Open Shop
            </button>
          )}
          <button
            className={currentStep.shopHint ? 'ghost-btn' : 'primary-btn'}
            onClick={() => engine.acknowledgeTutorial(currentStep.flag)}
          >
            Got it!
          </button>
          <button
            className="ghost-btn"
            onClick={() => {
              TUTORIAL_STEPS.forEach((step) => {
                if (!snap.save.tutorialFlags[step.flag]) {
                  engine.acknowledgeTutorial(step.flag)
                }
              })
            }}
          >
            Skip Tutorial
          </button>
        </div>
      </div>
    </div>
  )
}
