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
import { type DocumentURI } from '@hcengineering/collaborator-client'
import { HocuspocusProvider, type HocuspocusProviderConfiguration } from '@hocuspocus/provider'
import { Doc as Ydoc } from 'yjs'

export type DocumentId = DocumentURI

export type TiptapCollabProviderConfiguration = HocuspocusProviderConfiguration &
Required<Pick<HocuspocusProviderConfiguration, 'token'>> &
Omit<HocuspocusProviderConfiguration, 'parameters'> & {
  parameters: TiptapCollabProviderURLParameters
}

export interface TiptapCollabProviderURLParameters {
  initialContentId?: DocumentId
  targetContentId?: DocumentId
}

export class TiptapCollabProvider extends HocuspocusProvider {
  loaded: Promise<void>

  constructor (configuration: TiptapCollabProviderConfiguration) {
    const parameters: Record<string, any> = {}

    const initialContentId = configuration.parameters?.initialContentId
    if (initialContentId !== undefined && initialContentId !== '') {
      parameters.initialContentId = initialContentId
    }

    const targetContentId = configuration.parameters?.targetContentId
    if (targetContentId !== undefined && targetContentId !== '') {
      parameters.targetContentId = targetContentId
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
    this.configuration.websocketProvider.disconnect()
    super.destroy()
  }
}

export const createTiptapCollaborationData = (params: {
  collaboratorURL: string
  documentId: DocumentId
  initialContentId: DocumentId | undefined
  targetContentId: DocumentId | undefined
  token: string
}): { provider: TiptapCollabProvider, ydoc: Ydoc } => {
  const ydoc: Ydoc = new Ydoc()
  return {
    ydoc,
    provider: new TiptapCollabProvider({
      url: params.collaboratorURL,
      name: params.documentId,
      document: ydoc,
      token: params.token,
      parameters: {
        initialContentId: params.initialContentId,
        targetContentId: params.targetContentId
      }
    })
  }
}
