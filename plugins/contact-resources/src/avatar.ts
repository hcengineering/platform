//
// Copyright © 2022 Hardcore Engineering Inc.
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

import contact, { AvatarType, AvatarProvider } from '@hcengineering/contact'
import { Client } from '@hcengineering/core'

export async function getAvatarProvider (client: Client, type: AvatarType): Promise<AvatarProvider> {
  const ref = contact.avatarProvider.Image
  const object = await client.findOne(contact.class.AvatarProvider, { _id: ref })
  if (object === undefined) throw new Error(`Provider not found, _id: ${ref}`)

  return object
}
