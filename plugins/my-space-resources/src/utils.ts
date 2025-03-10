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

import type { Doc, DocumentQuery } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import contact, { getCurrentEmployee } from '@hcengineering/contact'

export async function buildPersonSpaceQuery (): Promise<DocumentQuery<Doc>> {
  const client = getClient()
  const employee = getCurrentEmployee()
  if (employee === undefined) {
    return {}
  }
  const space = await client.findOne(contact.class.PersonSpace, { person: employee }, { projection: { _id: 1 } })
  return space?._id !== undefined ? { space: space._id } : {}
}
