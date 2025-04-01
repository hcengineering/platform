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
import core, { type Class, type Client, type Doc, type Mixin, type Ref } from '@hcengineering/core'
import view, { type AttributeModel } from '@hcengineering/view'
import { buildRemovedDoc, getAttributePresenter } from '@hcengineering/view-resources'
import { type Card } from '@hcengineering/card'
import {
  type ActivityMessage,
  type ActivityUpdate,
  ActivityUpdateType,
  type Message,
  MessageType
} from '@hcengineering/communication-types'

const valueTypes: ReadonlyArray<Ref<Class<Doc>>> = [
  core.class.TypeString,
  core.class.EnumOf,
  core.class.TypeNumber,
  core.class.TypeDate,
  core.class.TypeFileSize,
  core.class.TypeMarkup,
  core.class.TypeHyperlink
]

async function getAttributePresenterSafe (
  client: Client,
  _class: Ref<Class<Doc>>,
  attrKey: string,
  mixin?: Ref<Mixin<Doc>>
): Promise<AttributeModel | undefined> {
  try {
    return await getAttributePresenter(client, _class, attrKey, { key: attrKey }, mixin)
  } catch (e) {
    console.error(e)
  }
}

export async function getAttributeModel (
  client: Client,
  update: ActivityUpdate | undefined,
  _class: Ref<Class<Card>>
): Promise<AttributeModel | undefined> {
  if (update == null || update.type !== ActivityUpdateType.Attribute) return undefined

  const { attrKey } = update

  const model = await getAttributePresenterSafe(
    client,
    update.mixin ?? _class,
    attrKey,
    view.mixin.ActivityAttributePresenter
  )

  if (model !== undefined) {
    return model
  }

  return await getAttributePresenterSafe(client, update.mixin ?? _class, attrKey)
}

export function isMarkupAttribute (model: AttributeModel): boolean {
  return (
    model.attribute?.type?._class === core.class.TypeMarkup ||
    model.attribute?.type?._class === core.class.TypeCollaborativeDoc
  )
}

export async function getAttributeValues (
  client: Client,
  value: any | any[],
  attrClass: Ref<Class<Doc>>
): Promise<any[]> {
  const values = Array.isArray(value) ? value : [value]
  if (values.some((value) => typeof value !== 'string')) {
    return values
  }

  if (valueTypes.includes(attrClass)) {
    return values
  }

  const docs = await client.findAll(attrClass, { _id: { $in: values } })
  const docIds = docs.map(({ _id }) => _id)
  const missedIds = values.filter((value) => !docIds.includes(value))
  const removedDocs = await Promise.all(missedIds.map(async (value) => await buildRemovedDoc(client, value, attrClass)))
  const allDocs = [...docs, ...removedDocs].filter((doc) => !(doc == null))

  if (allDocs.length > 0) {
    return allDocs
  }

  return values
}

export function isActivityMessage (message: Message): message is ActivityMessage {
  return message.type === MessageType.Activity
}
