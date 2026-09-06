//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { createConfirmGate } from '../confirm-gate'

describe('confirm-gate', () => {
  it('starts not confirming', () => {
    expect(createConfirmGate().isConfirming()).toBe(false)
  })

  it('returns true after setConfirming(true)', () => {
    const gate = createConfirmGate()
    gate.setConfirming(true)
    expect(gate.isConfirming()).toBe(true)
  })

  it('returns false after setConfirming(false)', () => {
    const gate = createConfirmGate()
    gate.setConfirming(true)
    gate.setConfirming(false)
    expect(gate.isConfirming()).toBe(false)
  })

  it('is idempotent for repeated setConfirming(true)', () => {
    const gate = createConfirmGate()
    gate.setConfirming(true)
    gate.setConfirming(true)
    expect(gate.isConfirming()).toBe(true)
  })

  it('scopes state per instance — two gates are independent', () => {
    // Regression guard for the review finding on PR #10992: with the old
    // module-scope flag, a confirm popup in one mounted GanttView froze
    // pointer input in every other mounted GanttView.
    const a = createConfirmGate()
    const b = createConfirmGate()

    a.setConfirming(true)
    expect(a.isConfirming()).toBe(true)
    expect(b.isConfirming()).toBe(false)

    b.setConfirming(true)
    a.setConfirming(false)
    expect(a.isConfirming()).toBe(false)
    expect(b.isConfirming()).toBe(true)
  })
})
