//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { get } from 'svelte/store'
import {
  claimResultCountOwner,
  releaseResultCountOwner,
  resetResultCount,
  resultIssueCountStore,
  setResultCount
} from '../stores'

describe('resultIssueCountStore owner-token gate', () => {
  beforeEach(() => {
    // Drop any ownership left over from a previous test and return the store to
    // the `-1` sentinel: claim a throwaway token (becomes current), then
    // release it (current → clears owner, resets to -1).
    releaseResultCountOwner(claimResultCountOwner())
  })

  it('a new writer supersedes the previous owner', () => {
    const first = claimResultCountOwner()
    setResultCount(first, 5)
    expect(get(resultIssueCountStore)).toBe(5)

    const second = claimResultCountOwner()
    // Proof of supersede: the first token can no longer write.
    setResultCount(first, 99)
    expect(get(resultIssueCountStore)).toBe(5)
    // The second (current) token can.
    setResultCount(second, 7)
    expect(get(resultIssueCountStore)).toBe(7)
  })

  it('writes from a superseded writer are ignored', () => {
    const first = claimResultCountOwner()
    setResultCount(first, 3)

    const second = claimResultCountOwner()
    setResultCount(second, 10)

    setResultCount(first, 42) // superseded → ignored
    expect(get(resultIssueCountStore)).toBe(10)
  })

  it('release from a superseded writer does NOT reset the new owner count', () => {
    const first = claimResultCountOwner()
    const second = claimResultCountOwner()
    setResultCount(second, 8)

    releaseResultCountOwner(first) // no-op: first is not current
    expect(get(resultIssueCountStore)).toBe(8)
  })

  it('release from the current writer resets to -1', () => {
    const owner = claimResultCountOwner()
    setResultCount(owner, 4)

    releaseResultCountOwner(owner)
    expect(get(resultIssueCountStore)).toBe(-1)
  })

  it('query reset (-1) then a current write repopulates the value', () => {
    const owner = claimResultCountOwner()
    setResultCount(owner, 6)

    resetResultCount() // query/filter changed → pending sentinel, ownership kept
    expect(get(resultIssueCountStore)).toBe(-1)

    setResultCount(owner, 9) // still the current owner → value reappears
    expect(get(resultIssueCountStore)).toBe(9)
  })

  // Regression (store-contract level; the List.svelte conditional itself has no
  // component test harness in this package): an embedded, non-primary List
  // (sub-issues / related issues in the issue panel, card-panel children, process
  // extensions) used to unconditionally claim + release the owner token, which
  // stranded the primary Issues viewlet with a dead token whose later writes
  // became no-ops — the zero-hit SearchEmptyState card never rendered again after
  // opening and closing a panel. The fix makes reporting opt-in: `reportResultCount`
  // defaults to `false`, so only ListView (the primary viewlet) opts in and every
  // embedded List stays out of the gate. This test models that contract: as long
  // as the embedded consumer never claims, the primary viewlet remains the current
  // owner throughout and its writes keep taking effect.
  it('an opted-out embedded consumer (never claims) leaves the primary owner writable', () => {
    // Primary Issues viewlet mounts and reports its search-result count.
    const viewlet = claimResultCountOwner()
    setResultCount(viewlet, 12)
    expect(get(resultIssueCountStore)).toBe(12)

    // User opens an issue/card: the embedded List defaults to reportResultCount=false,
    // i.e. it NEVER calls claim/setResultCount/release.
    // (Nothing to invoke here — the whole point is that it does not touch the gate.)

    // A fresh search on the primary viewlet now returns zero hits.
    setResultCount(viewlet, 0)
    // Because ownership was never superseded, the write lands and the zero-hit
    // card can render (count === 0, not the stuck -1 of the pre-fix bug).
    expect(get(resultIssueCountStore)).toBe(0)

    // Sanity: the primary owner remains authoritative for further writes.
    setResultCount(viewlet, 4)
    expect(get(resultIssueCountStore)).toBe(4)
  })
})
