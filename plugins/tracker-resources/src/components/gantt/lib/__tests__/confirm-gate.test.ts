//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { isConfirming, setConfirming, __resetConfirmGate } from '../confirm-gate'

describe('confirm-gate', () => {
  beforeEach(() => {
    __resetConfirmGate()
  })

  it('defaults to false on first read', () => {
    expect(isConfirming()).toBe(false)
  })

  it('returns true after setConfirming(true)', () => {
    setConfirming(true)
    expect(isConfirming()).toBe(true)
  })

  it('returns false after setConfirming(false)', () => {
    setConfirming(true)
    setConfirming(false)
    expect(isConfirming()).toBe(false)
  })

  it('idempotent set true', () => {
    setConfirming(true)
    setConfirming(true)
    expect(isConfirming()).toBe(true)
  })

  it('reset helper clears the flag', () => {
    setConfirming(true)
    __resetConfirmGate()
    expect(isConfirming()).toBe(false)
  })
})
