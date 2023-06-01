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

import calendar, { Event } from '@hcengineering/calendar'
import { Class, Doc, DocumentQuery, FindOptions, FindResult, Hierarchy, Ref } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { getHTMLPresenter, getTextPresenter } from '@hcengineering/server-notification-resources'

/**
 * @public
 */
export async function FindReminders (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  const result = await findAll(calendar.mixin.Reminder, { attachedTo: doc._id })
  return result
}

/**
 * @public
 */
export async function EventHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const event = doc as Event
  const target = (await control.findAll(event.attachedToClass, { _id: event.attachedTo }, { limit: 1 }))[0]
  if (target !== undefined) {
    const HTMLPresenter = getHTMLPresenter(target._class, control.hierarchy)
    const htmlPart =
      HTMLPresenter !== undefined ? await (await getResource(HTMLPresenter.presenter))(target, control) : undefined
    return htmlPart
  }
}

/**
 * @public
 */
export async function EventTextPresenter (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const event = doc as Event
  const target = (await control.findAll(event.attachedToClass, { _id: event.attachedTo }, { limit: 1 }))[0]
  if (target !== undefined) {
    const TextPresenter = getTextPresenter(target._class, control.hierarchy)
    if (TextPresenter === undefined) return
    return await (
      await getResource(TextPresenter.presenter)
    )(target, control)
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    EventHTMLPresenter,
    EventTextPresenter,
    FindReminders
  }
})
