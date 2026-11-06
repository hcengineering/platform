//
// Copyright © 2026 TraceX SAS.
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

import { type PlatformContext } from '@hcengineering/ai-core'
import { type Doc } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import serverNotification, { type Presenter } from '@hcengineering/server-notification'

interface NamedDocument extends Doc {
  title?: unknown
  name?: unknown
}

/** Resolve a server-readable document title consistently across workspace tools. */
export async function getDocumentTitle (ctx: PlatformContext, doc: Doc): Promise<string> {
  const presenter = ctx.hierarchy.classHierarchyMixin(doc._class, serverNotification.mixin.TextPresenter)
  if (presenter !== undefined) {
    try {
      const fn = await getResource<Presenter<Doc>>(presenter.presenter)
      // Preserve object.lookup's legacy presenter adapter; unsupported presenters fall back to stored fields.
      const title = await fn(doc, ctx as any)
      if (typeof title === 'string' && title.trim().length > 0) return title
    } catch (err) {
      ctx.ctx.warn('Failed to format text presenter title', {
        error: err instanceof Error ? err.message : String(err),
        class: doc._class,
        id: doc._id
      })
    }
  }

  const namedDoc = doc as NamedDocument
  for (const value of [namedDoc.title, namedDoc.name]) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return doc._id
}
