//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 *  fix — drag-commit confirmation gate.
 *
 * Background. After a Gantt bar drag ends, the user-configurable
 * confirmation popup (GanttConfirmCommitPopup or ConfirmCascadePopup)
 * runs as a non-modal showPopup. The window-level pointer listeners that
 * GanttView attaches while the drag is active stay wired the whole time
 * the popup is open — which produced two bugs reported in *
 *   1. Hover-bug: pointermove kept calling the drag reducer, so the bar
 *      visually trailed the cursor while the popup was up.
 *   2. Double-popup-bug: clicking the popup's Cancel/Apply button bubbled
 *      pointerup to window, which re-entered handleCanvasPointerUp while
 *      activeDrag was still in `dragging-body` — opening a second popup.
 *
 * This module is a tiny module-scope flag. GanttView toggles it on
 * before showing a confirmation popup and off when the popup resolves.
 * The pointer handlers consult {@link isConfirming} to short-circuit.
 *
 * The flag is module-scope (not store-based) on purpose — there is only
 * ever one drag in flight, the consumer is GanttView, and the flag is
 * always set/cleared inside the same async commit path. A Svelte store
 * would force a reactive cycle through `$:` blocks for a guard that
 * needs to be read synchronously inside event handlers.
 */

let confirming = false

export function setConfirming (value: boolean): void {
  confirming = value
}

export function isConfirming (): boolean {
  return confirming
}

/** Test-only — reset flag between specs so a leaked-true doesn't bleed. */
export function __resetConfirmGate (): void {
  confirming = false
}
