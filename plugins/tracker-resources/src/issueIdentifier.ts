//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Returns the project identifier part of an issue identifier (e.g. `TSK` for `TSK-12`),
 * or undefined if the value does not look like an issue identifier.
 */
export function getIssueIdentifierPrefix (issueId: string): string | undefined {
  const match = /^(\S+)-\d+$/.exec(issueId)
  return match?.[1]
}
