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

import { type CollaboratorClient, getClient as getCollaborator } from '@hcengineering/collaborator-client'
import { type Blob, type CollaborativeDoc, type Markup, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'

import presentation from './plugin'

function getClient (): CollaboratorClient {
  const workspaceUuid = getMetadata(presentation.metadata.WorkspaceUuid)
  if (workspaceUuid === undefined) {
    throw new Error('WorkspaceUuid is not defined')
  }

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorURL = getMetadata(presentation.metadata.CollaboratorUrl) ?? ''

  return getCollaborator(workspaceUuid, token, collaboratorURL)
}

/** @public */
export async function getMarkup (doc: CollaborativeDoc, source: Ref<Blob> | null | undefined): Promise<Markup> {
  const client = getClient()
  return await client.getMarkup(doc, source)
}

/** @public */
export async function createMarkup (doc: CollaborativeDoc, markup: Markup): Promise<Ref<Blob>> {
  const client = getClient()
  return await client.createMarkup(doc, markup)
}

/** @public */
export async function updateMarkup (doc: CollaborativeDoc, markup: Markup): Promise<void> {
  const client = getClient()
  await client.updateMarkup(doc, markup)
}

/** @public */
export async function copyMarkup (source: CollaborativeDoc, target: CollaborativeDoc): Promise<void> {
  const client = getClient()
  await client.copyContent(source, target)
}
