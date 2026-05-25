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

import type { AccountListRow } from '@hcengineering/account-client'
import type { ListAccountsAdminQueryParams } from '../../types'
import { escapeLike } from '../../util/escapeLike'

// Whitelist of sort columns — never interpolate unsanitised user input.
const ALLOWED_SORT_FIELDS: Record<string, string> = {
  name: "LOWER(p.first_name), LOWER(p.last_name)",
  email: 's.primary_email NULLS LAST',
  auth: '(CASE WHEN s.has_email AND s.has_oidc THEN 2 WHEN s.has_oidc THEN 1 ELSE 0 END)',
  workspace_count: 'COALESCE(w.cnt, 0)',
  last_activity: 'a.last_activity_at NULLS LAST',
  status: 'a.disabled_at NULLS FIRST'
}

export function buildListAccountsAdminSql (
  ns: string,
  params: ListAccountsAdminQueryParams,
  adminEmails: string[]
): { rowsSql: string, countSql: string, rowsArgs: any[], countArgs: any[] } {
  const conds: string[] = []
  const args: any[] = []

  function ph (v: any): string {
    args.push(v)
    return `$${args.length}`
  }

  // search — ILIKE across name parts + primary_email. Escape user-
  // supplied % and _ so the box is a literal-substring filter, not a
  // wildcard DSL. ESCAPE '\' lets PG interpret the doubled-up
  // backslashes from escapeLike() as literals.
  if (params.search != null && params.search.trim() !== '') {
    const needle = `%${escapeLike(params.search.trim())}%`
    const i = args.length + 1
    args.push(needle)
    conds.push(`(p.first_name ILIKE $${i} ESCAPE '\\' OR p.last_name ILIKE $${i} ESCAPE '\\' OR s.primary_email ILIKE $${i} ESCAPE '\\' OR a.uuid::TEXT ILIKE $${i} ESCAPE '\\')`)
  }

  // statusIn
  if (params.statusIn != null && params.statusIn.length === 1) {
    conds.push(params.statusIn[0] === 'active' ? 'a.disabled_at IS NULL' : 'a.disabled_at IS NOT NULL')
  }
  // statusIn with both values → no condition (full set)

  // isAdmin filter
  if (params.isAdmin === true) {
    conds.push(`LOWER(s.primary_email) = ANY(${ph(adminEmails.map((e) => e.toLowerCase()))}::TEXT[])`)
  } else if (params.isAdmin === false) {
    conds.push(`(s.primary_email IS NULL OR NOT (LOWER(s.primary_email) = ANY(${ph(adminEmails.map((e) => e.toLowerCase()))}::TEXT[])))`)
  }

  // authMethodIn
  if (params.authMethodIn != null && params.authMethodIn.length > 0) {
    const orParts: string[] = []
    for (const m of params.authMethodIn) {
      if (m === 'email_only') orParts.push('(s.has_email AND NOT s.has_oidc)')
      else if (m === 'oidc') orParts.push('(s.has_oidc AND NOT s.has_email)')
      else if (m === 'mixed') orParts.push('(s.has_email AND s.has_oidc)')
    }
    if (orParts.length > 0) conds.push(`(${orParts.join(' OR ')})`)
  }

  // nameContains — see escapeLike() comment in `search` above for the
  // rationale; same treatment, same ESCAPE clause.
  if (params.nameContains != null && params.nameContains.trim() !== '') {
    conds.push(`(p.first_name || ' ' || p.last_name) ILIKE ${ph('%' + escapeLike(params.nameContains.trim()) + '%')} ESCAPE '\\'`)
  }

  // emailContains
  if (params.emailContains != null && params.emailContains.trim() !== '') {
    conds.push(`s.primary_email ILIKE ${ph('%' + escapeLike(params.emailContains.trim()) + '%')} ESCAPE '\\'`)
  }

  // workspaceUuidsIn — account must be member of at least one of the listed workspaces
  if (params.workspaceUuidsIn != null && params.workspaceUuidsIn.length > 0) {
    conds.push(`EXISTS (SELECT 1 FROM ${ns}.workspace_members wm WHERE wm.account_uuid = a.uuid AND wm.workspace_uuid = ANY(${ph(params.workspaceUuidsIn)}::UUID[]))`)
  }

  // wsMin / wsMax
  const wsMin = params.wsMin != null ? Math.max(0, params.wsMin) : undefined
  const wsMax = params.wsMax != null ? Math.max(0, params.wsMax) : undefined
  if (wsMin != null) conds.push(`COALESCE(w.cnt, 0) >= ${ph(wsMin)}`)
  if (wsMax != null) conds.push(`COALESCE(w.cnt, 0) <= ${ph(wsMax)}`)

  // lastActivityFilter
  const laf = params.lastActivityFilter
  if (laf != null) {
    if (laf.kind === 'never') {
      conds.push('a.last_activity_at IS NULL')
    } else if (laf.kind === 'before') {
      conds.push(`a.last_activity_at < ${ph(laf.tsMs)}`)
    } else if (laf.kind === 'after') {
      conds.push(`a.last_activity_at >= ${ph(laf.tsMs)}`)
    } else if (laf.kind === 'between') {
      conds.push(`a.last_activity_at BETWEEN ${ph(laf.from)} AND ${ph(laf.to)}`)
    } else if (laf.kind === 'range') {
      // Legacy compat with ListAccountsAdminParams.lastActivityFilter.kind='range'
      if (laf.fromMs != null) conds.push(`a.last_activity_at >= ${ph(laf.fromMs)}`)
      if (laf.toMs != null) conds.push(`a.last_activity_at <= ${ph(laf.toMs)}`)
    }
  }

  // orphan: active + 0 workspaces
  if (params.orphan === true) {
    conds.push('COALESCE(w.cnt, 0) = 0 AND a.disabled_at IS NULL')
  }

  const where = conds.length === 0 ? 'TRUE' : conds.join(' AND ')

  // ORDER BY — use whitelisted column expressions only
  const sortField = params.sort?.field ?? 'name'
  const sortDir = params.sort?.direction === 'desc' ? 'DESC' : 'ASC'
  const orderCol = ALLOWED_SORT_FIELDS[sortField] ?? ALLOWED_SORT_FIELDS.name
  const orderBy = `${orderCol} ${sortDir}`

  // Pagination
  const limit = Math.min(Math.max(1, params.pagination?.limit ?? 50), 500)
  const offset = Math.max(0, params.pagination?.offset ?? 0)
  const limitPh = ph(limit)
  const offsetPh = ph(offset)

  // COUNT query shares all conditions but strips LIMIT/OFFSET args.
  // countArgs = args up to (but not including) the LIMIT and OFFSET push.
  const countArgs = args.slice(0, args.length - 2)

  const cteBlock = `
    WITH ws_counts AS (
      SELECT account_uuid, COUNT(*) AS cnt
      FROM ${ns}.workspace_members
      GROUP BY account_uuid
    ),
    socials AS (
      -- Compare via the stored \`key\` text column (format "<type>:<value>")
      -- to avoid enum coercion. Some legacy rows have type values that
      -- are no longer in the social_id_type enum; reading them directly
      -- triggers "invalid input value for enum" inside aggregates.
      -- \`key\` is a STORED generated column, so it doesn't re-evaluate
      -- the enum at SELECT time.
      SELECT
        person_uuid,
        BOOL_OR(key LIKE 'email:%' AND verified_on IS NOT NULL) AS has_email,
        BOOL_OR(key LIKE 'oidc:%'  AND verified_on IS NOT NULL) AS has_oidc,
        MIN(value) FILTER (WHERE key LIKE 'email:%' AND verified_on IS NOT NULL) AS primary_email
      FROM ${ns}.social_id
      GROUP BY person_uuid
    )`

  const joinedTables = `
    FROM ${ns}.account a
    INNER JOIN ${ns}.person p ON p.uuid = a.uuid
    LEFT JOIN socials s   ON s.person_uuid = a.uuid
    LEFT JOIN ws_counts w ON w.account_uuid = a.uuid`

  const rowsSql = `
    ${cteBlock}
    SELECT
      a.uuid,
      p.first_name, p.last_name,
      CASE WHEN a.disabled_at IS NULL THEN 'active' ELSE 'disabled' END AS status,
      a.last_activity_at,
      a.disabled_at,
      COALESCE(s.has_email, false) AS has_email,
      COALESCE(s.has_oidc,  false) AS has_oidc,
      s.primary_email,
      COALESCE(w.cnt, 0) AS workspace_count
    ${joinedTables}
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${limitPh} OFFSET ${offsetPh}
  `

  const countSql = `
    ${cteBlock}
    SELECT COUNT(*) AS n
    ${joinedTables}
    WHERE ${where}
  `

  return { rowsSql, countSql, rowsArgs: args, countArgs }
}

export function rowToAccountListRow (row: any, adminEmails: string[]): AccountListRow {
  const primaryEmail: string = row.primary_email ?? ''
  const isAdmin = primaryEmail !== '' && adminEmails.some((e) => e.toLowerCase() === primaryEmail.toLowerCase())
  const authMethods: Array<'email' | 'oidc'> = []
  if (row.has_email === true) authMethods.push('email')
  if (row.has_oidc === true) authMethods.push('oidc')
  return {
    uuid: row.uuid,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    status: row.status,
    lastActivityAt: row.last_activity_at != null ? Number(row.last_activity_at) : null,
    primaryEmail: primaryEmail !== '' ? primaryEmail : null,
    authMethods,
    workspaceCount: Number(row.workspace_count ?? 0),
    isAdmin
  }
}
