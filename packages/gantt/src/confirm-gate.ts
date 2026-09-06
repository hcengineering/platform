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
 * Each GanttView creates its own gate via {@link createConfirmGate} —
 * the flag is instance-scoped, so two Gantt views mounted at the same
 * time (e.g. two workspace tabs rendered in one JS context) cannot block
 * each other's drag input. The component toggles the gate on before
 * showing a confirmation popup and off when the popup resolves; the
 * pointer handlers consult `isConfirming` to short-circuit.
 *
 * A plain closure (not a Svelte store) on purpose — the flag is always
 * set/cleared inside the same async commit path and must be readable
 * synchronously inside event handlers; a store would force a reactive
 * cycle through `$:` blocks for a guard that never drives markup.
 */

/** Per-GanttView drag-commit confirmation gate. */
export interface ConfirmGate {
  setConfirming: (value: boolean) => void
  isConfirming: () => boolean
}

/** Create an independent gate. One per mounted GanttView. */
export function createConfirmGate (): ConfirmGate {
  let confirming = false
  return {
    setConfirming: (value: boolean): void => {
      confirming = value
    },
    isConfirming: (): boolean => confirming
  }
}
