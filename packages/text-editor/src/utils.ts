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

import { TiptapCollabProvider } from './provider'
import * as Y from 'yjs'

type ProviderData = (
  | {
    provider: TiptapCollabProvider
  }
  | {
    collaboratorURL: string
    token: string
  }
) & { ydoc?: Y.Doc }

function getProvider (
  documentId: string,
  providerData: ProviderData,
  initialContentId?: string
): { provider: TiptapCollabProvider, dispose?: () => void } {
  if (!('provider' in providerData)) {
    const provider = new TiptapCollabProvider({
      url: providerData.collaboratorURL,
      name: documentId,
      document: providerData.ydoc ?? new Y.Doc(),
      token: providerData.token,
      parameters: {
        initialContentId: initialContentId ?? ''
      }
    })

    return {
      provider,
      dispose: () => {
        provider.destroy()
      }
    }
  } else {
    return { provider: providerData.provider }
  }
}

export function copyDocumentField (
  documentId: string,
  srcFieldId: string,
  dstFieldId: string,
  providerData: ProviderData,
  initialContentId?: string
): void {
  const { provider, dispose } = getProvider(documentId, providerData, initialContentId)
  provider.copyField(documentId, srcFieldId, dstFieldId)
  dispose?.()
}

export function copyDocumentContent (
  documentId: string,
  snapshotId: string,
  providerData: ProviderData,
  initialContentId?: string
): void {
  const { provider, dispose } = getProvider(documentId, providerData, initialContentId)
  provider.copyContent(documentId, snapshotId)
  dispose?.()
}
