//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import {
  toggleSelection,
  selectSingle,
  selectRange,
  clearSelection,
  selectAll
} from '../bulk-selection'

const A = 'A' as Ref<Issue>
const B = 'B' as Ref<Issue>
const C = 'C' as Ref<Issue>
const D = 'D' as Ref<Issue>
const E = 'E' as Ref<Issue>

describe('bulk-selection — pure helpers', () => {
  describe('toggleSelection', () => {
    it('adds an id that is not in the set', () => {
      const set = new Set<Ref<Issue>>([A])
      const next = toggleSelection(set, B)
      expect(next.has(A)).toBe(true)
      expect(next.has(B)).toBe(true)
      expect(next.size).toBe(2)
    })

    it('removes an id that is already in the set', () => {
      const set = new Set<Ref<Issue>>([A, B])
      const next = toggleSelection(set, B)
      expect(next.has(A)).toBe(true)
      expect(next.has(B)).toBe(false)
      expect(next.size).toBe(1)
    })

    it('does not mutate the input set', () => {
      const set = new Set<Ref<Issue>>([A])
      const next = toggleSelection(set, B)
      expect(set.size).toBe(1) // input untouched
      expect(next).not.toBe(set)
    })
  })

  describe('selectSingle', () => {
    it('returns a set with exactly one id', () => {
      const next = selectSingle(A)
      expect(next.size).toBe(1)
      expect(next.has(A)).toBe(true)
    })
  })

  describe('selectRange', () => {
    const ordered: Array<Ref<Issue>> = [A, B, C, D, E]

    it('selects the inclusive range between anchor and target in order', () => {
      const next = selectRange(new Set(), B, D, ordered)
      expect(Array.from(next).sort()).toEqual(['B', 'C', 'D'])
    })

    it('selects the inclusive range when anchor is after target in order', () => {
      const next = selectRange(new Set(), D, B, ordered)
      expect(Array.from(next).sort()).toEqual(['B', 'C', 'D'])
    })

    it('preserves existing selection and adds the range', () => {
      const set = new Set<Ref<Issue>>([A])
      const next = selectRange(set, C, D, ordered)
      expect(Array.from(next).sort()).toEqual(['A', 'C', 'D'])
    })

    it('falls back to selectSingle when anchor is null', () => {
      const next = selectRange(new Set(), null, C, ordered)
      expect(Array.from(next)).toEqual(['C'])
    })

    it('falls back to selectSingle when anchor is unknown to the ordered list', () => {
      const next = selectRange(new Set(), 'unknown' as Ref<Issue>, C, ordered)
      expect(Array.from(next)).toEqual(['C'])
    })

    it('falls back to selectSingle when target is unknown to the ordered list', () => {
      const next = selectRange(new Set(), A, 'unknown' as Ref<Issue>, ordered)
      expect(Array.from(next)).toEqual(['unknown'])
    })
  })

  describe('clearSelection', () => {
    it('returns an empty set', () => {
      const next = clearSelection()
      expect(next.size).toBe(0)
    })
  })

  describe('selectAll', () => {
    it('returns a set with every id from the ordered list', () => {
      const next = selectAll([A, B, C])
      expect(next.size).toBe(3)
      expect(next.has(A)).toBe(true)
      expect(next.has(B)).toBe(true)
      expect(next.has(C)).toBe(true)
    })

    it('returns an empty set when the input is empty', () => {
      const next = selectAll([])
      expect(next.size).toBe(0)
    })

    it('deduplicates ids', () => {
      const next = selectAll([A, A, B])
      expect(next.size).toBe(2)
    })
  })
})
