//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { markupToJSON, jsonToMarkup, type MarkupNode, MarkupNodeType } from '@hcengineering/text-core'
import { type Markup } from '@hcengineering/core'

/**
 * Rewrite the grantsAccess attribute on mention references in a message's
 * markup according to per-person choices made in the send-time disclosure.
 *
 * - choice === false  -> set grantsAccess='false' on EVERY reference to that
 *   person. Setting all of them is required because extractReferences merges
 *   any-wins: a single remaining undefined reference would re-grant access.
 * - choice === true   -> set grantsAccess='true' explicitly.
 * - person not in the map -> left unchanged (e.g. existing space members,
 *   whose mentions stay undefined and grant-by-default as before).
 *
 * Pure function: returns a new markup string; does not mutate its input
 * string (it parses, mutates the parsed tree, and re-serializes).
 */
export function applyMentionGrantChoices (markup: Markup, choices: Map<string, boolean>): Markup {
  if (choices.size === 0) return markup
  let node: MarkupNode
  try {
    node = markupToJSON(markup)
  } catch {
    return markup
  }

  const walk = (n: MarkupNode): void => {
    // Use `!= null` to guard against both `undefined` AND `null` — a defensive
    // attrs == null on a reference node would otherwise throw on n.attrs.id.
    if (n.type === MarkupNodeType.reference && n.attrs != null) {
      const id = n.attrs.id as string
      const choice = choices.get(id)
      if (choice !== undefined) {
        n.attrs.grantsAccess = choice ? 'true' : 'false'
      }
    }
    n.content?.forEach(walk)
  }
  walk(node)

  return jsonToMarkup(node)
}
