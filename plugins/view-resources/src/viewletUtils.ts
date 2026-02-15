//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//

import type { Client, Ref } from '@hcengineering/core'
import view, { type Viewlet, type ViewletViewAction } from '@hcengineering/view'

/** Shape used by the header UI; both viewlet- and descriptor-scoped actions provide this. */
export interface ResolvedViewletSpecialAction {
  _id: Ref<ViewletViewAction>
  extension: ViewletViewAction['extension']
  config?: Record<string, any>
}

/**
 * Resolve special view actions for a viewlet by:
 * 1. One query: ViewletViewAction where viewlet is in (current + template viewlets) OR descriptor matches.
 * 2. For rows with descriptor set, filter by applicableToClass and disabledForClass.
 * Actions are deduplicated by extension (viewlet-scoped take precedence).
 */
export function getViewletSpecialActions (client: Client, viewlet: Viewlet): ResolvedViewletSpecialAction[] {
  const model = client.getModel()
  const hierarchy = client.getHierarchy()

  let actions = model.findAllSync(view.class.ViewletViewAction, {
    viewlet: viewlet._id
  }) as ViewletViewAction[]
  if (actions == null || actions.length === 0) {
    actions = model.findAllSync(view.class.ViewletViewAction, {
      descriptor: viewlet.descriptor
    }) as ViewletViewAction[]
  }

  if (actions == null || actions.length === 0) {
    return []
  }

  const filtered = actions.filter((a) => {
    if (a.descriptor != null) {
      if (a.applicableToClass != null && !hierarchy.isDerived(viewlet.attachTo, a.applicableToClass)) {
        return false
      }
      if (a.disabledForClass != null && hierarchy.isDerived(viewlet.attachTo, a.disabledForClass)) {
        return false
      }
    }
    return true
  })

  const seen = new Set<string>()
  const result: ResolvedViewletSpecialAction[] = []
  const byViewlet = filtered.filter((a) => a.viewlet != null)
  const byDescriptor = filtered.filter((a) => a.descriptor != null)
  for (const a of [...byViewlet, ...byDescriptor]) {
    if (seen.has(a.extension)) continue
    seen.add(a.extension)
    result.push({ _id: a._id, extension: a.extension, config: a.config })
  }
  return result
}
