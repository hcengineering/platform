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

import { Blob, CollaborativeDoc, Markup, MarkupBlobRef, Ref, WorkspaceId, concatLink } from '@hcengineering/core'
import { encodeDocumentId } from './utils'

/** @public */
export interface GetContentRequest {
  source?: Ref<Blob>
}

/** @public */
export interface GetContentResponse {
  content: Record<string, Markup>
}

/** @public */
export interface CreateContentRequest {
  content: Record<string, Markup>
}

/** @public */
export interface CreateContentResponse {
  content: Record<string, MarkupBlobRef>
}

/** @public */
export interface UpdateContentRequest {
  content: Record<string, Markup>
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UpdateContentResponse {}

/** @public */
export interface CollaboratorClient {
  getMarkup: (document: CollaborativeDoc, source?: Ref<Blob> | null) => Promise<Markup>
  createMarkup: (document: CollaborativeDoc, markup: Markup) => Promise<MarkupBlobRef>
  updateMarkup: (document: CollaborativeDoc, markup: Markup) => Promise<void>
  copyContent: (source: CollaborativeDoc, target: CollaborativeDoc) => Promise<void>
}

/** @public */
export function getClient (workspaceId: WorkspaceId, token: string, collaboratorUrl: string): CollaboratorClient {
  const url = collaboratorUrl.replaceAll('wss://', 'https://').replace('ws://', 'http://')
  return new CollaboratorClientImpl(workspaceId, token, url)
}

class CollaboratorClientImpl implements CollaboratorClient {
  constructor (
    private readonly workspace: WorkspaceId,
    private readonly token: string,
    private readonly collaboratorUrl: string
  ) {}

  private async rpc<P, R>(document: CollaborativeDoc, method: string, payload: P): Promise<R> {
    const workspace = this.workspace.name
    const documentId = encodeDocumentId(workspace, document)

    const url = concatLink(this.collaboratorUrl, `/rpc/${encodeURIComponent(documentId)}`)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method, payload })
    })

    if (!res.ok) {
      throw new Error('HTTP error ' + res.status)
    }

    const result = await res.json()

    if (result.error != null) {
      throw new Error(result.error)
    }

    return result as R
  }

  async getMarkup (document: CollaborativeDoc, source?: Ref<Blob> | null): Promise<Markup> {
    const payload: GetContentRequest = {
      source: source !== null ? source : undefined
    }

    const res = await retry(
      3,
      async () => {
        return await this.rpc<GetContentRequest, GetContentResponse>(document, 'getContent', payload)
      },
      50
    )

    return res.content[document.objectAttr] ?? ''
  }

  async createMarkup (document: CollaborativeDoc, markup: Markup): Promise<MarkupBlobRef> {
    const content = {
      [document.objectAttr]: markup
    }

    const res = await retry(
      3,
      async () => {
        return await this.rpc<CreateContentRequest, CreateContentResponse>(document, 'createContent', { content })
      },
      50
    )

    return res.content[document.objectAttr]
  }

  async updateMarkup (document: CollaborativeDoc, markup: Markup): Promise<void> {
    const content = {
      [document.objectAttr]: markup
    }

    await retry(
      3,
      async () => {
        await this.rpc<UpdateContentRequest, UpdateContentResponse>(document, 'updateContent', { content })
      },
      50
    )
  }

  async copyContent (source: CollaborativeDoc, target: CollaborativeDoc, content?: Ref<Blob>): Promise<void> {
    const markup = await this.getMarkup(source, content)
    await this.updateMarkup(target, markup)
  }
}

async function retry<T> (retries: number, op: () => Promise<T>, delay: number = 100): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      if (retries !== 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
