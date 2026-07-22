//
// Copyright © 2026 Hardcore Engineering Inc.
//

import { fakeDb } from './testUtils'

describe('pruneAuditOlderThan', () => {
  it('returns 0 when nothing is older than the cutoff', async () => {
    const db = fakeDb()
    db.setAuditLog([
      { id: 'a', ts_ms: 100 },
      { id: 'b', ts_ms: 200 }
    ])
    const deleted = await db.pruneAuditOlderThan(50)
    expect(deleted).toBe(0)
    expect(db.auditLogIds()).toEqual(['a', 'b'])
  })

  it('deletes only rows strictly older than the cutoff', async () => {
    const db = fakeDb()
    db.setAuditLog([
      { id: 'old1', ts_ms: 100 },
      { id: 'old2', ts_ms: 150 },
      { id: 'edge', ts_ms: 200 }, // == cutoff → kept
      { id: 'newer', ts_ms: 300 }
    ])
    const deleted = await db.pruneAuditOlderThan(200)
    expect(deleted).toBe(2)
    expect(db.auditLogIds().sort()).toEqual(['edge', 'newer'])
  })

  it('returns 0 on an empty audit log', async () => {
    const db = fakeDb()
    db.setAuditLog([])
    const deleted = await db.pruneAuditOlderThan(Date.now())
    expect(deleted).toBe(0)
  })

  it('handles cutoff in the future (deletes everything)', async () => {
    const db = fakeDb()
    db.setAuditLog([
      { id: 'a', ts_ms: 100 },
      { id: 'b', ts_ms: 200 }
    ])
    const deleted = await db.pruneAuditOlderThan(Date.now() + 86_400_000)
    expect(deleted).toBe(2)
    expect(db.auditLogIds()).toEqual([])
  })
})
