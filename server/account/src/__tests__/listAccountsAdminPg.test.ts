//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { buildListAccountsAdminSql, rowToAccountListRow } from '../collections/postgres/listAccountsAdminPg'

const NS = 'global_account'

const baseRow = {
  uuid: 'a1111111-1111-4111-9111-111111111111',
  first_name: 'Ada',
  last_name: 'Lovelace',
  status: 'active',
  last_activity_at: null,
  has_email: true,
  has_oidc: false,
  primary_email: 'ada@example.com',
  workspace_count: 2
}

describe('buildListAccountsAdminSql', () => {
  it('selects has_password from account_passwords', () => {
    const { rowsSql } = buildListAccountsAdminSql(NS, {}, [])
    expect(rowsSql).toMatch(
      /EXISTS\s*\(\s*SELECT 1 FROM global_account\.account_passwords pw WHERE pw\.account_uuid = a\.uuid\s*\)\s+AS has_password/
    )
  })

  it("authMethodIn ['none'] filters accounts without a verified email or OIDC social id", () => {
    const { rowsSql, countSql } = buildListAccountsAdminSql(NS, { authMethodIn: ['none'] }, [])
    const cond = '(NOT COALESCE(s.has_email, false) AND NOT COALESCE(s.has_oidc, false))'
    expect(rowsSql).toContain(cond)
    expect(countSql).toContain(cond)
  })

  it("authMethodIn ['none'] is no longer a no-op (WHERE is not TRUE)", () => {
    const { countSql } = buildListAccountsAdminSql(NS, { authMethodIn: ['none'] }, [])
    expect(countSql).not.toMatch(/WHERE TRUE\s*$/)
  })

  it("combines 'none' with other auth methods via OR", () => {
    const { rowsSql } = buildListAccountsAdminSql(NS, { authMethodIn: ['oidc', 'none'] }, [])
    expect(rowsSql).toContain(
      '((s.has_oidc AND NOT s.has_email) OR (NOT COALESCE(s.has_email, false) AND NOT COALESCE(s.has_oidc, false)))'
    )
  })

  it('keeps the existing auth-method branches unchanged', () => {
    const { rowsSql } = buildListAccountsAdminSql(NS, { authMethodIn: ['email_only', 'mixed'] }, [])
    expect(rowsSql).toContain('((s.has_email AND NOT s.has_oidc) OR (s.has_email AND s.has_oidc))')
  })
})

describe('rowToAccountListRow', () => {
  it('maps has_password = true to hasPassword: true', () => {
    expect(rowToAccountListRow({ ...baseRow, has_password: true }, []).hasPassword).toBe(true)
  })

  it('maps has_password = false / missing to hasPassword: false', () => {
    expect(rowToAccountListRow({ ...baseRow, has_password: false }, []).hasPassword).toBe(false)
    expect(rowToAccountListRow({ ...baseRow }, []).hasPassword).toBe(false)
  })

  it('keeps the other fields', () => {
    const r = rowToAccountListRow({ ...baseRow, has_password: true }, ['ADA@example.com'])
    expect(r).toEqual({
      uuid: baseRow.uuid,
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: 'active',
      lastActivityAt: null,
      primaryEmail: 'ada@example.com',
      authMethods: ['email'],
      workspaceCount: 2,
      isAdmin: true,
      hasPassword: true
    })
  })
})

describe('buildListAccountsAdminSql ordering and pagination', () => {
  const orderBy = (sql: string): string => (/ORDER BY ([\s\S]*?)\s+LIMIT/.exec(sql)?.[1] ?? '').trim()

  it('applies the direction to every name column and adds a uuid tie-breaker', () => {
    const { rowsSql } = buildListAccountsAdminSql(NS, { sort: { field: 'name', direction: 'desc' } }, [])
    expect(orderBy(rowsSql)).toBe('LOWER(p.first_name) DESC, LOWER(p.last_name) DESC, a.uuid DESC')
  })

  it('puts NULLS FIRST/LAST after the direction', () => {
    expect(orderBy(buildListAccountsAdminSql(NS, { sort: { field: 'email', direction: 'desc' } }, []).rowsSql)).toBe(
      's.primary_email DESC NULLS LAST, a.uuid DESC'
    )
    expect(orderBy(buildListAccountsAdminSql(NS, { sort: { field: 'status', direction: 'asc' } }, []).rowsSql)).toBe(
      'a.disabled_at ASC NULLS FIRST, a.uuid ASC'
    )
  })

  it('falls back to name for unknown sort fields, including prototype keys', () => {
    for (const field of ['bogus', 'constructor', '__proto__']) {
      const { rowsSql } = buildListAccountsAdminSql(NS, { sort: { field: field as any, direction: 'asc' } }, [])
      expect(orderBy(rowsSql)).toBe('LOWER(p.first_name) ASC, LOWER(p.last_name) ASC, a.uuid ASC')
    }
  })

  it('binds limit/offset as the last parameters and keeps them out of the count query', () => {
    const { rowsArgs, countArgs, countSql } = buildListAccountsAdminSql(
      NS,
      { search: 'a', pagination: { limit: 10000, offset: -5 } },
      []
    )
    expect(rowsArgs.slice(-2)).toEqual([500, 0])
    expect(countArgs).toEqual(['%a%'])
    expect(countSql).not.toContain('LIMIT')
  })

  it('escapes LIKE wildcards in user input', () => {
    const { rowsArgs, rowsSql } = buildListAccountsAdminSql(NS, { search: '50%_off' }, [])
    expect(rowsArgs[0]).toBe('%50\\%\\_off%')
    expect(rowsSql).toContain("ESCAPE '\\'")
  })

  it('compares admin emails case-insensitively', () => {
    const { rowsArgs } = buildListAccountsAdminSql(NS, { isAdmin: true }, ['Admin@Example.com'])
    expect(rowsArgs[0]).toEqual(['admin@example.com'])
  })
})
