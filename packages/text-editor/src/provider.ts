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

import { HocuspocusProvider, HocuspocusProviderConfiguration } from '@hocuspocus/provider'

export type TiptapCollabProviderConfiguration = HocuspocusProviderConfiguration &
Required<Pick<HocuspocusProviderConfiguration, 'token'>>

export class TiptapCollabProvider extends HocuspocusProvider {
  constructor (configuration: TiptapCollabProviderConfiguration) {
    super(configuration as HocuspocusProviderConfiguration)
  }

  copyContent (sourceId: string, targetId: string): void {
    const payload = {
      action: 'document.copy',
      params: { sourceId, targetId }
    }
    this.sendStateless(JSON.stringify(payload))
  }

  destroy (): void {
    this.configuration.websocketProvider.disconnect()
    super.destroy()
  }
}
