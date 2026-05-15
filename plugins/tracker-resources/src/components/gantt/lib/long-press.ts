//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 *  — Mobile-Friendly Gantt — long-press timer state machine.
 *
 * Pure reducer used by the touch-aware drag entry-points on Tablet/Desktop.
 * The DOM layer feeds it `start` / `tick` / `move` / `cancel` events and
 * reads back the discriminated state — no setTimeout/Date.now leaks into
 * this module, so it's trivially testable with synthetic timestamps.
 *
 *   idle      → start(now, x, y)         → pending(startedAt=now, x, y)
 *   pending   → tick(now ≥ start+300)    → fired
 *   pending   → move(>10 px from x,y)    → cancelled
 *   pending   → cancel()                 → idle
 *   fired     → tick / move              → fired (idempotent)
 *   cancelled → cancel/tick              → cancelled (terminal)
 *
 * Spec §"Tablet": Long-Press (300ms) auf Bar = Selection-Mode.
 * Movement-threshold (10 px) borrowed from MS-Touch — below this the user
 * is "holding still", above they're trying to scroll.
 */

export const LONG_PRESS_MS = 300
export const MOVE_THRESHOLD_PX = 10

export type LongPressState =
  | { kind: 'idle' }
  | { kind: 'pending', startedAt: number, x: number, y: number }
  | { kind: 'fired' }
  | { kind: 'cancelled' }

export type LongPressEvent =
  | { type: 'start', now: number, x: number, y: number }
  | { type: 'tick', now: number }
  | { type: 'move', now: number, x: number, y: number }
  | { type: 'cancel' }

export function initial (): LongPressState {
  return { kind: 'idle' }
}

export function reduceLongPress (state: LongPressState, event: LongPressEvent): LongPressState {
  switch (event.type) {
    case 'start':
      if (state.kind === 'pending') return state // second start while pending is a no-op
      return { kind: 'pending', startedAt: event.now, x: event.x, y: event.y }
    case 'tick':
      if (state.kind !== 'pending') return state
      if (event.now - state.startedAt >= LONG_PRESS_MS) return { kind: 'fired' }
      return state
    case 'move':
      if (state.kind !== 'pending') return state
      {
        const dx = event.x - state.x
        const dy = event.y - state.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > MOVE_THRESHOLD_PX) return { kind: 'cancelled' }
      }
      return state
    case 'cancel':
      return { kind: 'idle' }
  }
}
