//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { applyPatches } from '@hcengineering/communication-shared'
import type { Message, MessageID, MessagesGroup, Patch, WorkspaceID } from '@hcengineering/communication-types'
import { loadGroupFile } from '@hcengineering/communication-yaml'

export async function loadMessageFromGroup(
  id: MessageID,
  workspace: WorkspaceID,
  filesUrl: string,
  group?: MessagesGroup,
  patches: Patch[] = []
): Promise<Message | undefined> {
  if (group == null) return

  const parsedFile = await loadGroupFile(workspace, filesUrl, group, { retries: 5 })

  const message = parsedFile.messages.find((it) => it.id === id)
  if (message == null) return

  return applyPatches(message, patches)
}
