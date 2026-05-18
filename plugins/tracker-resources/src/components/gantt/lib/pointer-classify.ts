//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { LayoutMode } from './breakpoint'

/**
 *  — Mobile-Friendly Gantt — pointer-classification.
 *
 * Given the current layout mode, the originating PointerEvent's
 * `pointerType` and the user-visible action ("what is the user trying to
 * do"), return whether the action should be allowed directly, blocked
 * outright (read-only Phone mode), or gated behind a long-press timer
 * (Touch on Tablet/Desktop).
 *
 * The classifier is the single source of truth for the
 * Tablet-voll / Phone-read-only decision (Spec §1). Keeping it as a pure
 * function lets unit tests cover every cell of the matrix without
 * jsdom's partial Touch-Event support.
 */

export type PointerKind = PointerEvent['pointerType'] | 'mouse' | 'touch' | 'pen' | ''
export type PointerAction = 'tap' | 'drag' | 'resize' | 'connector'
export type PointerDecision = 'allow' | 'long-press' | 'block'

export function classifyPointer (
  mode: LayoutMode,
  pointerType: PointerKind,
  action: PointerAction
): PointerDecision {
  if (mode === 'phone') {
    // Phone is strictly read-only regardless of input device. Only `tap`
    // (open Quick-Info / activate Sidebar drawer) is allowed.
    return action === 'tap' ? 'allow' : 'block'
  }

  if (action === 'tap') return 'allow'

  // Tablet + Desktop: pen/mouse are direct; touch requires a long-press
  // confirmation (Spec §"Tablet": Long-Press 300 ms = Selection-Mode).
  if (pointerType === 'touch') return 'long-press'
  return 'allow'
}
