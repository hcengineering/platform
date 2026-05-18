//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { MIN_PPD, MAX_PPD } from './zoom'

/**
 *  — Mobile-Friendly Gantt — pinch-zoom tracker.
 *
 * Pure pointer-tracking reducer for 2-finger pinch on the Gantt canvas.
 * The DOM layer wires it to `pointerdown` / `pointermove` / `pointerup`
 * / `pointercancel` (iOS Safari scroll-inertia case) and reads back the
 * current `distance` ratio to drive `userPxPerDay` via
 * `computePxPerDayFromRatio()`.
 *
 * Design (Spec §"Pinch-Zoom"):
 *   - Native 2-finger pinch zooms the Time-Scale, NOT a CSS-Scale.
 *   - Cursor-Anker = midpoint between the two fingers AT pinch-start.
 *   - Pinch-in (fingers together) → zoom out  (ratio < 1, ppd shrinks).
 *   - Pinch-out (fingers apart)   → zoom in   (ratio > 1, ppd grows).
 */

export interface Point { x: number, y: number }

export type PinchState =
  | { kind: 'idle' }
  | { kind: 'single', id: number, x: number, y: number }
  | {
      kind: 'pinch'
      idA: number
      idB: number
      a: Point
      b: Point
      center: Point
      initialDistance: number
      currentDistance: number
      initialPxPerDay: number
    }

export type PinchEvent =
  | { type: 'down', id: number, x: number, y: number, pxPerDay: number }
  | { type: 'move', id: number, x: number, y: number }
  | { type: 'up', id: number }
  | { type: 'cancel' }

export function initial (): PinchState {
  return { kind: 'idle' }
}

export function computeDistance (a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function computeCenter (a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Map a pinch distance-ratio to a new px-per-day, clamped to the same
 * [MIN_PPD, MAX_PPD] range that Ctrl+Wheel-zoom uses (Spec §"Pinch":
 * Δ-Distanz mapped auf pxPerDay-Ratio analog Ctrl+Wheel aus ).
 *
 * Defensive: non-finite or zero ratios are treated as "no change".
 */
export function computePxPerDayFromRatio (initialPpd: number, ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return initialPpd
  if (!Number.isFinite(initialPpd) || initialPpd <= 0) return MIN_PPD
  const next = initialPpd * ratio
  if (next < MIN_PPD) return MIN_PPD
  if (next > MAX_PPD) return MAX_PPD
  return next
}

export function reducePinch (state: PinchState, event: PinchEvent): PinchState {
  switch (event.type) {
    case 'down':
      return onDown(state, event)
    case 'move':
      return onMove(state, event)
    case 'up':
      return onUp(state, event)
    case 'cancel':
      return { kind: 'idle' }
  }
}

function onDown (
  state: PinchState,
  event: Extract<PinchEvent, { type: 'down' }>
): PinchState {
  if (state.kind === 'idle') {
    return { kind: 'single', id: event.id, x: event.x, y: event.y }
  }
  if (state.kind === 'single') {
    const a: Point = { x: state.x, y: state.y }
    const b: Point = { x: event.x, y: event.y }
    const dist = computeDistance(a, b)
    return {
      kind: 'pinch',
      idA: state.id,
      idB: event.id,
      a,
      b,
      center: computeCenter(a, b),
      initialDistance: dist,
      currentDistance: dist,
      initialPxPerDay: event.pxPerDay
    }
  }
  // Already pinching — ignore third+ touches (Spec: only 2-finger gesture).
  return state
}

function onMove (
  state: PinchState,
  event: Extract<PinchEvent, { type: 'move' }>
): PinchState {
  if (state.kind === 'single') {
    if (state.id !== event.id) return state
    return { ...state, x: event.x, y: event.y }
  }
  if (state.kind === 'pinch') {
    if (event.id !== state.idA && event.id !== state.idB) return state
    const a = event.id === state.idA ? { x: event.x, y: event.y } : state.a
    const b = event.id === state.idB ? { x: event.x, y: event.y } : state.b
    return { ...state, a, b, currentDistance: computeDistance(a, b) }
  }
  return state
}

function onUp (
  state: PinchState,
  event: Extract<PinchEvent, { type: 'up' }>
): PinchState {
  if (state.kind === 'single') {
    if (state.id !== event.id) return state
    return { kind: 'idle' }
  }
  if (state.kind === 'pinch') {
    if (event.id === state.idA) {
      return { kind: 'single', id: state.idB, x: state.b.x, y: state.b.y }
    }
    if (event.id === state.idB) {
      return { kind: 'single', id: state.idA, x: state.a.x, y: state.a.y }
    }
    return state
  }
  return state
}
