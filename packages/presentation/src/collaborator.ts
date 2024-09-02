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
import { type CollaborativeDoc, type Markup, getWorkspaceId } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'

import presentation from './plugin'

/** @public */
export function getCollaboratorClient (): CollaboratorClient {
  const workspaceId = getWorkspaceId(getMetadata(presentation.metadata.WorkspaceId) ?? '')
  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorURL = getMetadata(presentation.metadata.CollaboratorUrl) ?? ''

  return getCollaborator(workspaceId, token, collaboratorURL)
}

/** @public */
export async function getMarkup (collaborativeDoc: CollaborativeDoc): Promise<Record<string, Markup>> {
  const client = getCollaboratorClient()
  return await client.getContent(collaborativeDoc)
}

/** @public */
export async function updateMarkup (collaborativeDoc: CollaborativeDoc, content: Record<string, Markup>): Promise<void> {
  const client = getCollaboratorClient()
  await client.updateContent(collaborativeDoc, content)
}

/** @public */
export async function copyDocument (source: CollaborativeDoc, target: CollaborativeDoc): Promise<void> {
  const client = getCollaboratorClient()
  await client.copyContent(source, target)
}
