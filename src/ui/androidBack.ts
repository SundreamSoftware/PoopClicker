export type AndroidBackDumpPhase = 'idle' | 'countdown' | 'running' | 'finished'

export type AndroidBackAction =
  | { type: 'ack_tutorial'; flag: string }
  | { type: 'close_dump' }
  | { type: 'claim_dump' }
  | { type: 'confirm_abandon_dump' }
  | { type: 'close_flush' }
  | { type: 'close_play_sheet' }
  | { type: 'block' }
  | { type: 'go_play' }
  | { type: 'none' }

export function decideAndroidBack(input: {
  pendingTutorialFlag?: string
  dumpOpen: boolean
  dumpPhase: AndroidBackDumpPhase
  flushOpen: boolean
  playSheetOpen?: boolean
  offlineUnclaimed: boolean
  tab: string
}): AndroidBackAction {
  if (input.pendingTutorialFlag) {
    return { type: 'ack_tutorial', flag: input.pendingTutorialFlag }
  }
  if (input.dumpOpen) {
    if (input.dumpPhase === 'idle') return { type: 'close_dump' }
    if (input.dumpPhase === 'finished') return { type: 'claim_dump' }
    if (input.dumpPhase === 'countdown' || input.dumpPhase === 'running') {
      return { type: 'confirm_abandon_dump' }
    }
  }
  if (input.flushOpen) return { type: 'close_flush' }
  if (input.playSheetOpen) return { type: 'close_play_sheet' }
  if (input.offlineUnclaimed) return { type: 'block' }
  if (input.tab !== 'play') return { type: 'go_play' }
  return { type: 'none' }
}
