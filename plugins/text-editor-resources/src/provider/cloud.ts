//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { type Blob, type Ref } from '@hcengineering/core'
import { type Doc as YDoc } from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import { type Provider } from './types'

export interface DatalakeCollabProviderParameters {
  url: string
  name: string
  token: string

  document: YDoc
  source: Ref<Blob> | null
}

export class CloudCollabProvider extends WebsocketProvider implements Provider {
  readonly loaded: Promise<void>

  constructor ({ document, url, name, source, token }: DatalakeCollabProviderParameters) {
    const params = { token, source: source ?? '' }

    super(url, encodeURIComponent(name), document, { params })

    this.loaded = new Promise((resolve) => {
      this.on('synced', resolve)
    })
  }

  destroy (): void {
    this.disconnect()
  }
}
