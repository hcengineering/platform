//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type Readable } from 'stream'
import { type ContentTextAdapterConfiguration } from './configuration'
import { type ContentTextAdapter } from './types'

class ContentAdapter implements ContentTextAdapter {
  constructor (
    private readonly adapters: Map<string, ContentTextAdapter>,
    private readonly defaultAdapter: ContentTextAdapter
  ) {}

  content (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, type: string, doc: Readable): Promise<string> {
    const adapter = this.adapters.get(type) ?? this.defaultAdapter
    return adapter.content(ctx, workspace, name, type, doc)
  }
}

export async function createContentAdapter (
  contentAdapters: Record<string, ContentTextAdapterConfiguration>,
  defaultContentAdapter: string
): Promise<ContentTextAdapter> {
  const adapters = new Map<string, ContentTextAdapter>()
  let defaultAdapter: ContentTextAdapter | undefined

  for (const key in contentAdapters) {
    const adapterConf = contentAdapters[key]
    const adapter = await adapterConf.factory(adapterConf.url)

    adapters.set(adapterConf.contentType, adapter)
    if (key === defaultContentAdapter) {
      defaultAdapter = adapter
    }
  }
  if (defaultAdapter === undefined) {
    throw new Error('No default content adapter')
  }
  return new ContentAdapter(adapters, defaultAdapter)
}
