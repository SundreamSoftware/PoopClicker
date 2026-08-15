import { describe, expect, it } from 'vitest'
import { decideAndroidBack } from '../../src/ui/androidBack'

describe('decideAndroidBack', () => {
  const base = {
    dumpOpen: false,
    dumpPhase: 'idle' as const,
    flushOpen: false,
    offlineUnclaimed: false,
    tab: 'play',
  }

  it('acks the pending tutorial first', () => {
    expect(decideAndroidBack({ ...base, pendingTutorialFlag: 'core' })).toEqual({
      type: 'ack_tutorial',
      flag: 'core',
    })
  })

  it('closes, claims, or asks to abandon Daily Dump', () => {
    expect(decideAndroidBack({ ...base, dumpOpen: true, dumpPhase: 'idle' })).toEqual({
      type: 'close_dump',
    })
    expect(decideAndroidBack({ ...base, dumpOpen: true, dumpPhase: 'finished' })).toEqual({
      type: 'claim_dump',
    })
    expect(decideAndroidBack({ ...base, dumpOpen: true, dumpPhase: 'running' })).toEqual({
      type: 'confirm_abandon_dump',
    })
  })

  it('blocks offline claim and returns to Play from other tabs', () => {
    expect(decideAndroidBack({ ...base, flushOpen: true })).toEqual({ type: 'close_flush' })
    expect(decideAndroidBack({ ...base, offlineUnclaimed: true })).toEqual({ type: 'block' })
    expect(decideAndroidBack({ ...base, tab: 'shop' })).toEqual({ type: 'go_play' })
    expect(decideAndroidBack(base)).toEqual({ type: 'none' })
  })
})
