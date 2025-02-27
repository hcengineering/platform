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

import { type Data, type Ref, TxOperations } from '@hcengineering/core'
import type { ColorDefinition } from '@hcengineering/ui'
import { getMetadata, getResource } from '@hcengineering/platform'
import contact, { AvatarInfo, AvatarProvider, getAvatarProviderId, getFirstName, getLastName } from '.'

export interface AvatarUrlInfo {
  url: string | undefined
  srcSet: string | undefined
  color?: ColorDefinition
}

const providers = new Map<Ref<AvatarProvider>, AvatarProvider | null>()

export async function getAvatarProvider (
  client: TxOperations,
  providerId: Ref<AvatarProvider>
): Promise<AvatarProvider | undefined> {
  const provider = providers.get(providerId)

  if (provider !== undefined) {
    return provider ?? undefined
  }

  const res = await client.findOne(contact.class.AvatarProvider, { _id: providerId })

  providers.set(providerId, res ?? null)

  return res
}

export async function getAvatarUrlInfo (
  client: TxOperations,
  avatar?: Data<AvatarInfo>,
  width?: number,
  name?: string | null
): Promise<AvatarUrlInfo> {
  let url: string | undefined
  let srcSet: string | undefined
  let color: ColorDefinition | undefined

  const displayName = getAvatarDisplayName(name)

  if (avatar != null) {
    const avatarProviderId = getAvatarProviderId(avatar.avatarType)
    const avatarProvider =
      avatarProviderId !== undefined ? await getAvatarProvider(client, avatarProviderId) : undefined

    if (avatarProvider !== undefined) {
      const getUrlHandler = await getResource(avatarProvider.getUrl)
      ;({ url, srcSet, color } = await getUrlHandler(avatar, displayName, width))
    }
  }

  return {
    url,
    srcSet,
    color
  }
}

export function getAvatarDisplayName (name: string | null | undefined): string {
  if (name == null) {
    return ''
  }

  const lastFirst = getMetadata(contact.metadata.LastNameFirst) === true
  const fname = getFirstName(name ?? '').trim()[0] ?? ''
  const lname = getLastName(name ?? '').trim()[0] ?? ''

  return lastFirst ? lname + fname : fname + lname
}
