//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Shared in-memory AccountDB seams for unit tests.
//
// Kept deliberately minimal: only the seams currently consumed by a test
// belong here. Each test file may compose additional ad-hoc collaborators
// inline. Do NOT fold per-test fakeDb() variants (e.g. the one in
// listAccountsAdmin.test.ts) into this file unless they're actually shared
// across more than one test — keeping helpers local is the prevailing
// pattern in this directory.
//

interface AuditRow {
  id: string
  ts_ms: number
}

export interface FakeAccountDB {
  setAuditLog: (rows: AuditRow[]) => void
  auditLogIds: () => string[]
  pruneAuditOlderThan: (beforeMs: number) => Promise<number>
}

/**
 * In-memory AccountDB stub exposing audit-log seams.
 *
 * Mirrors PostgresAccountDB.pruneAuditOlderThan's contract:
 * rows whose ts_ms is strictly less than `beforeMs` are deleted;
 * rows with ts_ms == beforeMs are kept.
 */
export function fakeDb (): FakeAccountDB {
  let rows: AuditRow[] = []
  return {
    setAuditLog (next: AuditRow[]): void {
      rows = [...next]
    },
    auditLogIds (): string[] {
      return rows.map((r) => r.id)
    },
    async pruneAuditOlderThan (beforeMs: number): Promise<number> {
      const before = rows.length
      rows = rows.filter((r) => r.ts_ms >= beforeMs)
      return before - rows.length
    }
  }
}
