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

import core, {
  Branding,
  Doc,
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxOperations,
  TxProcessor,
  WorkspaceIdWithUrl,
  concatLink,
  generateId
} from '@hcengineering/core'
import guest, { PublicLink, guestAccountEmail, guestId } from '@hcengineering/guest'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import view from '@hcengineering/view'

/**
 * @public
 */
export async function OnPublicLinkCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const extractedTx = TxProcessor.extractTx(tx)

    const createTx = extractedTx as TxCreateDoc<PublicLink>

    const link = TxProcessor.createDoc2Doc<PublicLink>(createTx)

    if (link.url !== '') {
      continue
    }

    const resTx = control.txFactory.createTxUpdateDoc(link._class, link.space, link._id, {
      url: generateUrl(link._id, control.workspace, control.branding?.front)
    })

    result.push(resTx)
  }

  return result
}

export function getPublicLinkUrl (workspace: WorkspaceIdWithUrl, brandedFront?: string): string {
  const front = brandedFront ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${guestId}/${workspace.workspaceUrl}`
  return concatLink(front, path)
}

function generateUrl (linkId: Ref<PublicLink>, workspace: WorkspaceIdWithUrl, brandedFront?: string): string {
  const token = generateToken(guestAccountEmail, workspace, { linkId, guest: 'true' })
  return `${getPublicLinkUrl(workspace, brandedFront)}?token=${token}`
}

export async function getPublicLink (
  doc: Doc,
  client: TxOperations,
  workspace: WorkspaceIdWithUrl,
  revokable: boolean = true,
  branding: Branding | null
): Promise<string> {
  const current = await client.findOne(guest.class.PublicLink, { attachedTo: doc._id })
  if (current !== undefined) {
    if (!revokable && current.revokable) {
      await client.update(current, { revokable: false })
    }
    return current.url
  }
  const id = generateId<PublicLink>()
  const url = generateUrl(id, workspace, branding?.front)
  const fragment = getDocFragment(doc, client)
  await client.createDoc(
    guest.class.PublicLink,
    core.space.Workspace,
    {
      attachedTo: doc._id,
      location: {
        path: [],
        fragment
      },
      revokable,
      restrictions: {
        readonly: true,
        disableNavigation: true,
        disableActions: true,
        disableComments: true
      },
      url
    },
    id
  )
  return url
}

function getDocFragment (object: Doc, client: TxOperations): string {
  const panelComponent = client.getHierarchy().classHierarchyMixin(object._class, view.mixin.ObjectPanel)
  const comp = panelComponent?.component ?? view.component.EditDoc
  const props = [comp, object._id, Hierarchy.mixinOrClass(object), 'content']
  return encodeURIComponent(props.join('|'))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnPublicLinkCreate
  }
})
