/**
 * Web Audio SFX (sampled tap farts + procedural cues) and layered music beds.
 */

export type SfxId =
  | 'tap_plop'
  | 'tap_fart'
  | 'tap_squish'
  | 'crit'
  | 'upgrade'
  | 'generator_purchase'
  | 'achievement'
  | 'skin_unlock'
  | 'daily_complete'
  | 'daily_chest'
  | 'golden_spawn'
  | 'golden_catch'
  | 'clog'
  | 'unclog'
  | 'flush'
  | 'mega_flush'
  | 'frenzy_start'
  | 'overdrive_start'
  | 'event_start'
  | 'event_success'
  | 'event_fail'

type ToneShape = OscillatorType

interface ToneSpec {
  freq: number
  dur: number
  type?: ToneShape
  gain?: number
  slide?: number
  delay?: number
}

class AudioManagerImpl {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private unlocked = false
  private unlockBound = false
  private sfxEnabled = true
  private musicEnabled = true
  private musicPlaying = false
  private musicNodes: AudioNode[] = []
  private musicOscs: OscillatorNode[] = []
  private frenzyGain: GainNode | null = null
  private eventGain: GainNode | null = null
  private noiseCache: AudioBuffer | null = null
  private plopVariant = 0
  private fartBuffers: AudioBuffer[] = []
  private fartLoadPromise: Promise<void> | null = null

  private static readonly FART_SAMPLE_PATHS = [
    'assets/P0_audio/farts/fart_classic.mp3',
    'assets/P0_audio/farts/fart_small.mp3',
    'assets/P0_audio/farts/fart_deep.mp3',
    'assets/P0_audio/farts/fart_deep_alt.mp3',
  ] as const

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.85
      this.master.connect(this.ctx.destination)
      this.sfxBus = this.ctx.createGain()
      this.sfxBus.gain.value = this.sfxEnabled ? 0.9 : 0
      this.sfxBus.connect(this.master)
      this.musicBus = this.ctx.createGain()
      this.musicBus.gain.value = this.musicEnabled ? 0.28 : 0
      this.musicBus.connect(this.master)
    }
    return this.ctx
  }

  private bindUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return
    this.unlockBound = true
    const unlock = () => {
      void this.unlock()
    }
    window.addEventListener('pointerdown', unlock, { once: true, capture: true })
    window.addEventListener('keydown', unlock, { once: true, capture: true })
    window.addEventListener('touchstart', unlock, { once: true, capture: true })
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* ignore autoplay blocks until next gesture */
      }
    }
    this.unlocked = ctx.state === 'running'
    void this.preloadFartSamples()
    if (this.unlocked && this.musicEnabled && !this.musicPlaying) {
      this.startMusic()
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled
    this.bindUnlock()
    if (this.sfxBus) this.sfxBus.gain.value = enabled ? 0.9 : 0
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled
    this.bindUnlock()
    if (this.musicBus) this.musicBus.gain.value = enabled ? 0.28 : 0
    if (!enabled) this.stopMusic()
    else if (this.unlocked) this.startMusic()
  }

  play(id: SfxId | string): void {
    this.bindUnlock()
    if (!this.sfxEnabled) return
    const ctx = this.ensureContext()
    if (!ctx || !this.sfxBus) return
    if (!this.unlocked) {
      void this.unlock()
    }
    void this.preloadFartSamples()
    if (ctx.state !== 'running') return

    switch (id) {
      case 'tap_plop':
      case 'tap_fart':
        this.playTapFart()
        break
      case 'tap_squish':
        this.playNoiseBurst(0.05, 0.12, 900, 0.18)
        this.playTones([{ freq: 180, dur: 0.08, type: 'triangle', gain: 0.12, slide: -60 }])
        break
      case 'crit':
        this.playTones([
          { freq: 520, dur: 0.08, type: 'square', gain: 0.1 },
          { freq: 780, dur: 0.1, type: 'square', gain: 0.08, delay: 0.05 },
          { freq: 1040, dur: 0.14, type: 'triangle', gain: 0.07, delay: 0.1 },
        ])
        this.playNoiseBurst(0.04, 0.1, 2200, 0.12)
        break
      case 'upgrade':
        this.playArp([330, 415, 523, 659], 0.07, 'sine', 0.1)
        break
      case 'generator_purchase':
        this.playArp([220, 277, 330], 0.09, 'triangle', 0.11)
        this.playNoiseBurst(0.03, 0.08, 600, 0.08)
        break
      case 'achievement':
        this.playArp([392, 494, 587, 784, 988], 0.08, 'sine', 0.12)
        break
      case 'skin_unlock':
        this.playArp([523, 659, 784, 1046], 0.1, 'triangle', 0.11)
        this.playNoiseBurst(0.06, 0.16, 3000, 0.1)
        break
      case 'daily_complete':
        this.playArp([349, 440, 523, 698], 0.09, 'sine', 0.11)
        break
      case 'daily_chest':
        this.playTones([
          { freq: 180, dur: 0.12, type: 'square', gain: 0.08 },
          { freq: 360, dur: 0.14, type: 'triangle', gain: 0.1, delay: 0.08 },
          { freq: 720, dur: 0.18, type: 'sine', gain: 0.09, delay: 0.16 },
        ])
        break
      case 'golden_spawn':
        this.playTones([
          { freq: 880, dur: 0.2, type: 'sine', gain: 0.08, slide: 220 },
          { freq: 1320, dur: 0.25, type: 'triangle', gain: 0.06, delay: 0.05 },
        ])
        break
      case 'golden_catch':
        this.playArp([660, 880, 1320], 0.06, 'sine', 0.12)
        this.playNoiseBurst(0.03, 0.08, 4000, 0.1)
        break
      case 'clog':
        this.playNoiseBurst(0.12, 0.22, 280, 0.22)
        this.playTones([{ freq: 90, dur: 0.25, type: 'sawtooth', gain: 0.1, slide: -30 }])
        break
      case 'unclog':
        this.playNoiseBurst(0.08, 0.14, 500, 0.16)
        this.playTones([
          { freq: 140, dur: 0.1, type: 'triangle', gain: 0.1, slide: 80 },
          { freq: 280, dur: 0.12, type: 'sine', gain: 0.08, delay: 0.08 },
        ])
        break
      case 'flush':
        this.playNoiseBurst(0.2, 0.35, 400, 0.2)
        this.playTones([
          { freq: 220, dur: 0.25, type: 'sine', gain: 0.1, slide: -140 },
          { freq: 110, dur: 0.35, type: 'triangle', gain: 0.08, delay: 0.05, slide: -40 },
        ])
        break
      case 'mega_flush':
        this.playNoiseBurst(0.28, 0.45, 350, 0.28)
        this.playArp([196, 247, 311, 392, 494], 0.08, 'sawtooth', 0.08)
        break
      case 'frenzy_start':
        this.playArp([440, 554, 659, 880], 0.05, 'square', 0.09)
        break
      case 'overdrive_start':
        this.playArp([554, 698, 880, 1108, 1396], 0.045, 'square', 0.1)
        this.playNoiseBurst(0.05, 0.12, 2500, 0.14)
        break
      case 'event_start':
        this.playTones([
          { freq: 300, dur: 0.12, type: 'triangle', gain: 0.1 },
          { freq: 450, dur: 0.14, type: 'triangle', gain: 0.09, delay: 0.08 },
        ])
        break
      case 'event_success':
        this.playArp([392, 523, 659, 784], 0.07, 'sine', 0.12)
        break
      case 'event_fail':
        this.playTones([
          { freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.1, slide: -80 },
          { freq: 140, dur: 0.22, type: 'triangle', gain: 0.09, delay: 0.1, slide: -40 },
        ])
        break
      default:
        this.playTones([{ freq: 440, dur: 0.08, type: 'sine', gain: 0.06 }])
        break
    }
  }

  startMusic(): void {
    this.bindUnlock()
    const ctx = this.ensureContext()
    if (!ctx || !this.musicBus || !this.musicEnabled) return
    if (this.musicPlaying) return
    if (ctx.state !== 'running') {
      void this.unlock()
      return
    }

    this.stopMusicInternal(false)
    const now = ctx.currentTime

    const bedGain = ctx.createGain()
    bedGain.gain.value = 0.55
    bedGain.connect(this.musicBus)

    const makeDrone = (freq: number, type: ToneShape, gain: number, detune = 0) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      osc.detune.value = detune
      g.gain.value = gain
      osc.connect(g)
      g.connect(bedGain)
      osc.start(now)
      this.musicOscs.push(osc)
      this.musicNodes.push(g)
    }

    makeDrone(98, 'sine', 0.22)
    makeDrone(146.8, 'triangle', 0.1, 6)
    makeDrone(196, 'sine', 0.08, -4)

    // Soft pulse LFO on a mid pad
    const pulse = ctx.createOscillator()
    const pulseGain = ctx.createGain()
    const pad = ctx.createOscillator()
    const padGain = ctx.createGain()
    pulse.type = 'sine'
    pulse.frequency.value = 0.12
    pulseGain.gain.value = 0.04
    pad.type = 'triangle'
    pad.frequency.value = 246.9
    padGain.gain.value = 0.05
    pulse.connect(pulseGain)
    pulseGain.connect(padGain.gain)
    pad.connect(padGain)
    padGain.connect(bedGain)
    pulse.start(now)
    pad.start(now)
    this.musicOscs.push(pulse, pad)
    this.musicNodes.push(pulseGain, padGain, bedGain)

    this.frenzyGain = ctx.createGain()
    this.frenzyGain.gain.value = 0
    this.frenzyGain.connect(this.musicBus)
    const frenzyOsc = ctx.createOscillator()
    frenzyOsc.type = 'sawtooth'
    frenzyOsc.frequency.value = 55
    const frenzyFilter = ctx.createBiquadFilter()
    frenzyFilter.type = 'lowpass'
    frenzyFilter.frequency.value = 420
    frenzyOsc.connect(frenzyFilter)
    frenzyFilter.connect(this.frenzyGain)
    frenzyOsc.start(now)
    this.musicOscs.push(frenzyOsc)
    this.musicNodes.push(frenzyFilter, this.frenzyGain)

    this.eventGain = ctx.createGain()
    this.eventGain.gain.value = 0
    this.eventGain.connect(this.musicBus)
    const eventOsc = ctx.createOscillator()
    eventOsc.type = 'square'
    eventOsc.frequency.value = 82.4
    const eventFilter = ctx.createBiquadFilter()
    eventFilter.type = 'bandpass'
    eventFilter.frequency.value = 320
    eventFilter.Q.value = 2.2
    eventOsc.connect(eventFilter)
    eventFilter.connect(this.eventGain)
    eventOsc.start(now)
    this.musicOscs.push(eventOsc)
    this.musicNodes.push(eventFilter, this.eventGain)

    this.musicPlaying = true
  }

  stopMusic(): void {
    this.stopMusicInternal(true)
  }

  setFrenzyLayer(active: boolean): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.frenzyGain) return
    const target = active && this.musicEnabled ? 0.12 : 0
    this.frenzyGain.gain.cancelScheduledValues(ctx.currentTime)
    this.frenzyGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.25)
  }

  setEventLayer(active: boolean): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.eventGain) return
    const target = active && this.musicEnabled ? 0.1 : 0
    this.eventGain.gain.cancelScheduledValues(ctx.currentTime)
    this.eventGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.2)
  }

  private stopMusicInternal(markStopped: boolean): void {
    for (const osc of this.musicOscs) {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        /* already stopped */
      }
    }
    for (const node of this.musicNodes) {
      try {
        node.disconnect()
      } catch {
        /* ignore */
      }
    }
    this.musicOscs = []
    this.musicNodes = []
    this.frenzyGain = null
    this.eventGain = null
    if (markStopped) this.musicPlaying = false
    else this.musicPlaying = false
  }

  private fartSampleUrl(relativePath: string): string {
    const base = import.meta.env.BASE_URL ?? './'
    const normalizedBase = base.endsWith('/') ? base : `${base}/`
    return `${normalizedBase}${relativePath.replace(/^\/+/, '')}`
  }

  private preloadFartSamples(): Promise<void> {
    if (this.fartLoadPromise) return this.fartLoadPromise
    this.fartLoadPromise = (async () => {
      const ctx = this.ensureContext()
      if (!ctx) return
      const loaded: AudioBuffer[] = []
      for (const relativePath of AudioManagerImpl.FART_SAMPLE_PATHS) {
        try {
          const response = await fetch(this.fartSampleUrl(relativePath))
          if (!response.ok) continue
          const bytes = await response.arrayBuffer()
          loaded.push(await ctx.decodeAudioData(bytes.slice(0)))
        } catch {
          /* keep going — remaining samples / procedural fallback still work */
        }
      }
      this.fartBuffers = loaded
    })()
    return this.fartLoadPromise
  }

  /** Cycles authored MP3 fart samples so taps stay varied. */
  private playTapFart(): void {
    void this.preloadFartSamples()
    const ctx = this.ctx
    const bus = this.sfxBus
    if (!ctx || !bus) return

    if (this.fartBuffers.length === 0) {
      // First taps may race preload; tiny procedural stub until samples decode.
      this.playTones([{ freq: 120, dur: 0.08, type: 'sawtooth', gain: 0.08, slide: -50 }])
      this.playNoiseBurst(0.01, 0.06, 400, 0.1)
      return
    }

    const buffer = this.fartBuffers[this.plopVariant % this.fartBuffers.length]!
    this.plopVariant += 1

    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = 0.94 + Math.random() * 0.12
    const g = ctx.createGain()
    g.gain.value = 0.95
    src.connect(g)
    g.connect(bus)
    src.start(ctx.currentTime)
  }

  private playTones(specs: ToneSpec[]): void {
    const ctx = this.ctx
    const bus = this.sfxBus
    if (!ctx || !bus) return
    const now = ctx.currentTime
    for (const spec of specs) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = spec.type ?? 'sine'
      const start = now + (spec.delay ?? 0)
      const peak = spec.gain ?? 0.1
      osc.frequency.setValueAtTime(spec.freq, start)
      if (spec.slide) {
        osc.frequency.linearRampToValueAtTime(
          Math.max(20, spec.freq + spec.slide),
          start + spec.dur,
        )
      }
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + spec.dur)
      osc.connect(g)
      g.connect(bus)
      osc.start(start)
      osc.stop(start + spec.dur + 0.02)
    }
  }

  private playArp(freqs: number[], step: number, type: ToneShape, gain: number): void {
    this.playTones(
      freqs.map((freq, i) => ({
        freq,
        dur: step * 1.4,
        type,
        gain: gain * (1 - i * 0.08),
        delay: i * step,
      })),
    )
  }

  private getNoiseBuffer(): AudioBuffer | null {
    const ctx = this.ctx
    if (!ctx) return null
    if (this.noiseCache) return this.noiseCache
    const length = ctx.sampleRate * 0.5
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    this.noiseCache = buffer
    return buffer
  }

  private playNoiseBurst(attack: number, dur: number, cutoff: number, gain: number): void {
    const ctx = this.ctx
    const bus = this.sfxBus
    const buffer = this.getNoiseBuffer()
    if (!ctx || !bus || !buffer) return
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const g = ctx.createGain()
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(gain, now + Math.max(0.005, attack))
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    src.connect(filter)
    filter.connect(g)
    g.connect(bus)
    src.start(now)
    src.stop(now + dur + 0.02)
  }
}

/** Singleton-style audio facade used by UI / engine hooks. */
export const AudioManager = new AudioManagerImpl()

export default AudioManager
