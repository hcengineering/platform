//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
import { type DocumentId, type PlatformDocumentId } from '@hcengineering/collaborator-client'
import { HocuspocusProvider, type HocuspocusProviderConfiguration } from '@hocuspocus/provider'
import { type Provider } from './types'

export type HocuspocusCollabProviderConfiguration = HocuspocusProviderConfiguration &
Required<Pick<HocuspocusProviderConfiguration, 'token'>> &
Omit<HocuspocusProviderConfiguration, 'parameters'> & {
  parameters: HocuspocusCollabProviderURLParameters
}

export interface HocuspocusCollabProviderURLParameters {
  initialContentId?: DocumentId
  platformDocumentId?: PlatformDocumentId
}

export class HocuspocusCollabProvider extends HocuspocusProvider implements Provider {
  readonly loaded: Promise<void>

  constructor (configuration: HocuspocusCollabProviderConfiguration) {
    const parameters: Record<string, any> = {}

    const initialContentId = configuration.parameters?.initialContentId
    if (initialContentId !== undefined && initialContentId !== '') {
      parameters.initialContentId = initialContentId
    }

    const platformDocumentId = configuration.parameters?.platformDocumentId
    if (platformDocumentId !== undefined && platformDocumentId !== '') {
      parameters.platformDocumentId = platformDocumentId
    }

    const hocuspocusConfig: HocuspocusProviderConfiguration = {
      ...configuration,
      parameters
    }
    super(hocuspocusConfig)

    this.loaded = new Promise((resolve) => {
      this.on('synced', resolve)
    })
  }

  destroy (): void {
    super.destroy()
    this.configuration.websocketProvider.disconnect()
  }
}
