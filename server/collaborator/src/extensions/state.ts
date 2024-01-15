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

import core, { TxOperations, WorkspaceId, getWorkspaceId, toWorkspaceString } from '@hcengineering/core'
import { Extension, afterUnloadDocumentPayload, onLoadDocumentPayload } from '@hocuspocus/server'

import { withContext } from '../context'
import { Controller } from '../platform'

export interface StateConfiguration {
  controller: Controller
}

export class StateExtension implements Extension {
  private readonly workspaceDocuments: Map<string, Set<string>> = new Map<string, Set<string>>()

  constructor (private readonly configuration: StateConfiguration) {}

  async onLoadDocument ({ context, documentName }: withContext<onLoadDocumentPayload>): Promise<any> {
    const workspace = toWorkspaceString(context.workspaceId)

    const documents = this.workspaceDocuments.get(workspace) ?? new Set()
    documents.add(documentName)
    this.workspaceDocuments.set(workspace, documents)

    await this.updateStatus(context.workspaceId)
  }

  async afterUnloadDocument ({ documentName }: afterUnloadDocumentPayload): Promise<any> {
    for (const [workspace, documents] of this.workspaceDocuments) {
      if (documents.has(documentName)) {
        documents.delete(documentName)
        await this.updateStatus(getWorkspaceId(workspace))
      }
    }
  }

  private async updateStatus (workspaceId: WorkspaceId): Promise<void> {
    const documents = Array.from(this.workspaceDocuments.get(toWorkspaceString(workspaceId)) ?? [])

    const workspaceClient = await this.configuration.controller.get(workspaceId)
    const client = new TxOperations(workspaceClient.client, core.account.System, true)

    const current = await client.findOne(core.class.CollaborationState, { _id: core.collaboration.CollaborationState })

    if (current !== undefined) {
      await client.diffUpdate(current, { documents })
    } else {
      await client.createDoc(
        core.class.CollaborationState,
        core.space.Space,
        { documents },
        core.collaboration.CollaborationState
      )
    }
  }
}
