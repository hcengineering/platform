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

import calendar, { Calendar, Event, ReccuringEvent } from '@hcengineering/calendar'
import core, {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { getHTMLPresenter, getTextPresenter } from '@hcengineering/server-notification-resources'
import contact, { PersonAccount } from '@hcengineering/contact'

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
  const events = await findAll(calendar.class.Event, { attachedTo: doc._id })
  return events
}

/**
 * @public
 */
export async function ReminderHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string | undefined> {
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
export async function ReminderTextPresenter (doc: Doc, control: TriggerControl): Promise<string | undefined> {
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

/**
 * @public
 */
export async function OnPersonAccountCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<PersonAccount>
  const user = TxProcessor.createDoc2Doc(ctx)

  const res: TxCreateDoc<Calendar> = control.txFactory.createTxCreateDoc(
    calendar.class.Calendar,
    core.space.Space,
    {
      name: user.email,
      description: '',
      archived: false,
      private: false,
      members: [user._id]
    },
    `${user._id}_calendar` as Ref<Calendar>,
    undefined,
    user._id
  )
  return [res]
}

async function onEventCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Event>
  const ev = TxProcessor.createDoc2Doc(ctx)

  const res: Tx[] = []
  const accounts = await control.modelDb.findAll(contact.class.PersonAccount, {})
  const participants = accounts.filter(
    (p) => (p._id !== ev.createdBy ?? ev.modifiedBy) && ev.participants.includes(p.person)
  )
  for (const acc of participants) {
    const innerTx = control.txFactory.createTxCreateDoc(ev._class, `${acc._id}_calendar` as Ref<Calendar>, {
      eventId: ev.eventId,
      participants: ev.participants,
      externalParticipants: ev.externalParticipants,
      title: ev.title,
      description: ev.description,
      allDay: ev.allDay,
      attachedTo: ev.attachedTo,
      attachedToClass: ev.attachedToClass,
      collection: ev.collection,
      date: ev.date,
      dueDate: ev.dueDate,
      reminders: ev.reminders,
      location: ev.location,
      access: 'reader'
    })
    res.push(
      control.txFactory.createTxCollectionCUD(ev.attachedToClass, ev.attachedTo, ev.space, ev.collection, innerTx)
    )
  }

  return res
}

async function onEventUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxUpdateDoc<Event>
  const ev = (await control.findAll(calendar.class.Event, { _id: ctx.objectId }))[0]

  const res: Tx[] = []
  if (ev !== undefined) {
    const events = await control.findAll(calendar.class.Event, { eventId: ev.eventId, _id: { $ne: ev._id } })
    for (const event of events) {
      const innerTx = control.txFactory.createTxUpdateDoc(event._class, event.space, event._id, ctx.operations)
      res.push(
        control.txFactory.createTxCollectionCUD(
          event.attachedToClass,
          event.attachedTo,
          event.space,
          event.collection,
          innerTx
        )
      )
    }
  }
  return res
}

async function onEventRemove (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxRemoveDoc<Event>
  const event = control.removedMap.get(ctx.objectId)
  const res: Tx[] = []
  if (event !== undefined) {
    const events = await control.findAll(calendar.class.Event, { eventId: (event as Event).eventId })
    for (const event of events) {
      const innerTx = control.txFactory.createTxRemoveDoc(event._class, event.space, event._id)
      res.push(
        control.txFactory.createTxCollectionCUD(
          event.attachedToClass,
          event.attachedTo,
          event.space,
          event.collection,
          innerTx
        )
      )
    }
    if (event._class === calendar.class.ReccuringEvent) {
      const childs = await control.findAll(calendar.class.ReccuringInstance, {
        recurringEventId: (event as ReccuringEvent).eventId
      })
      for (const child of childs) {
        const innerTx = control.txFactory.createTxRemoveDoc(child._class, child.space, child._id)
        res.push(
          control.txFactory.createTxCollectionCUD(
            child.attachedToClass,
            child.attachedTo,
            child.space,
            child.collection,
            innerTx
          )
        )
      }
    }
  }

  return res
}

/**
 * @public
 */
export async function OnEvent (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  if (tx.space === core.space.DerivedTx) return []
  const ctx = TxProcessor.extractTx(tx) as TxCUD<Event>
  if (!control.hierarchy.isDerived(ctx.objectClass, calendar.class.Event)) return []
  switch (ctx._class) {
    case core.class.TxCreateDoc:
      return await onEventCreate(ctx, control)
    case core.class.TxUpdateDoc:
      return await onEventUpdate(ctx, control)
    case core.class.TxRemoveDoc:
      return await onEventRemove(ctx, control)
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    ReminderHTMLPresenter,
    ReminderTextPresenter,
    FindReminders
  },
  trigger: {
    OnEvent,
    OnPersonAccountCreate
  }
})
