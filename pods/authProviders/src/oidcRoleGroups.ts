//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { AccountRole, type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type AccountDB } from '@hcengineering/account'

import { type OidcClaims } from './oidcClaims'
import { getOidcGroups } from './oidcGroups'

export interface OidcRoleGroupRule {
  workspaceUrl: string
  group: string
  role: AccountRole
}

export interface ResolvedOidcRoleGroupRule extends OidcRoleGroupRule {
  workspaceUuid: WorkspaceUuid
}

export interface OidcWorkspaceRole {
  workspaceUuid: WorkspaceUuid
  workspaceUrl: string
  role: AccountRole | null
}

const roleByName: Record<string, AccountRole | undefined> = {
  OWNER: AccountRole.Owner,
  MAINTAINER: AccountRole.Maintainer,
  USER: AccountRole.User,
  GUEST: AccountRole.Guest
}

function normalize (value: string): string {
  return value.trim().toLowerCase()
}

/** Parses the environment format without exposing configured group names in logs. */
export function parseOidcRoleGroupRules (value: string | undefined): {
  rules: OidcRoleGroupRule[]
  invalidRuleCount: number
} {
  const rules: OidcRoleGroupRule[] = []
  let invalidRuleCount = 0

  for (const rawRule of (value ?? '').split(';')) {
    const rule = rawRule.trim()
    if (rule === '') continue

    const colon = rule.indexOf(':')
    const equals = rule.lastIndexOf('=')
    if (
      colon <= 0 ||
      colon !== rule.lastIndexOf(':') ||
      equals <= colon + 1 ||
      equals !== rule.indexOf('=') ||
      equals === rule.length - 1
    ) {
      invalidRuleCount++
      continue
    }

    const workspaceUrl = normalize(rule.slice(0, colon))
    const group = normalize(rule.slice(colon + 1, equals))
    const role =
      roleByName[
        rule
          .slice(equals + 1)
          .trim()
          .toUpperCase()
      ]
    // ',' separates entries of the derived OPENID_ALLOWED_GROUPS=auto allowlist,
    // so such a group would widen it; reject the rule instead.
    if (workspaceUrl === '' || group === '' || group.includes(',') || role === undefined) {
      invalidRuleCount++
      continue
    }

    rules.push({ workspaceUrl, group, role })
  }

  return { rules, invalidRuleCount }
}

/** Resolves configured workspace URLs to workspace ids; the caller caches a successful result. */
export async function resolveOidcRoleGroupRules (
  measureCtx: MeasureContext,
  db: AccountDB,
  configuredRules: string | undefined
): Promise<ResolvedOidcRoleGroupRule[]> {
  const { rules, invalidRuleCount } = parseOidcRoleGroupRules(configuredRules)
  if (invalidRuleCount > 0) {
    measureCtx.warn('Ignoring invalid OPENID_ROLE_GROUPS rules', { count: invalidRuleCount })
  }

  const resolved: ResolvedOidcRoleGroupRule[] = []
  for (const rule of rules) {
    const workspace = await db.workspace.findOne({ url: rule.workspaceUrl })
    if (workspace == null) {
      measureCtx.warn('Ignoring OPENID_ROLE_GROUPS rule for unknown workspace', { workspace: rule.workspaceUrl })
      continue
    }
    resolved.push({ ...rule, workspaceUuid: workspace.uuid })
  }
  return resolved
}

export function getAllowedGroups (
  configuredAllowedGroups: string | undefined,
  rules: ResolvedOidcRoleGroupRule[]
): string | null {
  if (configuredAllowedGroups?.trim().toLowerCase() !== 'auto') return configuredAllowedGroups ?? ''
  const groups = [...new Set(rules.map((rule) => rule.group))]
  // Preserve the distinction between an intentionally empty allowlist and an
  // `auto` allowlist whose rules could not be resolved.
  return groups.length > 0 ? groups.join(',') : null
}

/** Warn once, when the rules are resolved, if the derived allowlist would deny all users. */
export function warnOnEmptyAutoAllowedGroups (
  measureCtx: MeasureContext,
  configuredAllowedGroups: string | undefined,
  rules: ResolvedOidcRoleGroupRule[]
): void {
  if (configuredAllowedGroups?.trim().toLowerCase() === 'auto' && rules.length === 0) {
    measureCtx.warn('OPENID_ALLOWED_GROUPS=auto has no valid resolved role rules; denying all OIDC logins')
  }
}

export function getOidcWorkspaceRoles (
  claims: OidcClaims | undefined,
  rules: ResolvedOidcRoleGroupRule[]
): OidcWorkspaceRole[] | undefined {
  const oidcGroups = getOidcGroups(claims)
  if (oidcGroups.state !== 'available') return

  const groups = new Set(oidcGroups.groups)
  const roles = new Map<WorkspaceUuid, OidcWorkspaceRole>()
  for (const rule of rules) {
    const existing = roles.get(rule.workspaceUuid)
    const matches = groups.has(rule.group)
    if (existing === undefined) {
      roles.set(rule.workspaceUuid, {
        workspaceUuid: rule.workspaceUuid,
        workspaceUrl: rule.workspaceUrl,
        role: matches ? rule.role : null
      })
    } else if (matches && rolePower(rule.role) > rolePower(existing.role)) {
      existing.role = rule.role
    }
  }
  return [...roles.values()]
}

function rolePower (role: AccountRole | null): number {
  switch (role) {
    case AccountRole.Owner:
      return 4
    case AccountRole.Maintainer:
      return 3
    case AccountRole.User:
      return 2
    case AccountRole.Guest:
      return 1
    default:
      return 0
  }
}
