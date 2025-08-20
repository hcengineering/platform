//
// Copyright © 2022-2025 Hardcore Engineering Inc.
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
import calendar, { AccessLevel, Calendar, Event, getPrimaryCalendar } from '@hcengineering/calendar'
import contactPlugin, { Employee, Person } from '@hcengineering/contact'
import core, {
  AccountUuid,
  Class,
  concatLink,
  Data,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  getDiffUpdate,
  Hierarchy,
  PersonId,
  pickPrimarySocialId,
  Ref,
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import { getMetadata, getResource } from '@hcengineering/platform'
import serverCalendar from '@hcengineering/server-calendar'
import { getAccountBySocialId, getPerson, getSocialIds, getSocialStrings } from '@hcengineering/server-contact'
import { QueueTopic, TriggerControl } from '@hcengineering/server-core'
import { getHTMLPresenter, getTextPresenter } from '@hcengineering/server-notification-resources'
import { generateToken } from '@hcengineering/server-token'

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
  const target = (await control.findAll(control.ctx, event.attachedToClass, { _id: event.attachedTo }, { limit: 1 }))[0]
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
  const target = (await control.findAll(control.ctx, event.attachedToClass, { _id: event.attachedTo }, { limit: 1 }))[0]
  if (target !== undefined) {
    const TextPresenter = getTextPresenter(target._class, control.hierarchy)
    if (TextPresenter === undefined) return
    return await (
      await getResource(TextPresenter.presenter)
    )(target, control)
  }
}

export async function OnEmployee (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxMixin<Person, Employee>

    if (ctx.attributes?.active !== true) continue
    if (await checkCalendarsExist(control, ctx.objectId)) continue

    const socialIds = await getSocialIds(control, ctx.objectId)
    if (socialIds.length === 0) continue

    const socialId = pickPrimarySocialId(socialIds)._id

    const employee = (
      await control.findAll(
        control.ctx,
        contactPlugin.mixin.Employee,
        { _id: ctx.objectId as Ref<Employee> },
        { limit: 1 }
      )
    )[0]
    if (employee?.personUuid === undefined) continue
    if (employee.role === 'GUEST') {
      continue
    }

    result.push(await createCalendar(control, employee.personUuid, socialId))
  }

  return result
}

async function checkCalendarsExist (control: TriggerControl, person: Ref<Person>): Promise<boolean> {
  const socialStrings = await getSocialStrings(control, person)
  const calendars = await control.findAll(
    control.ctx,
    calendar.class.Calendar,
    { createdBy: { $in: socialStrings } },
    { limit: 1 }
  )

  return calendars.length > 0
}

async function createCalendar (control: TriggerControl, account: AccountUuid, socialId: PersonId): Promise<Tx> {
  const res: TxCreateDoc<Calendar> = control.txFactory.createTxCreateDoc(
    calendar.class.Calendar,
    calendar.space.Calendar,
    {
      name: 'HULY',
      hidden: false,
      visibility: 'public',
      user: socialId,
      access: AccessLevel.Owner
    },
    `${account}_calendar` as Ref<Calendar>,
    undefined,
    socialId
  )
  return res
}

async function getEventPerson (
  current: Event,
  calendars: Calendar[],
  control: TriggerControl
): Promise<Ref<Person> | undefined> {
  const calendar = calendars.find((c) => c._id === current.calendar)
  if (calendar === undefined) return
  const person = await getPerson(control, current.user ?? current.createdBy ?? current.modifiedBy)

  return person?._id
}

async function OnEvent (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxCUD<Event>
    if (ctx._class === core.class.TxCreateDoc) {
      result.push(...(await onEventCreate(ctx as TxCreateDoc<Event>, control)))
    } else if (ctx._class === core.class.TxUpdateDoc) {
      result.push(...(await onEventUpdate(ctx as TxUpdateDoc<Event>, control)))
    } else if (ctx._class === core.class.TxRemoveDoc) {
      result.push(...(await onRemoveEvent(ctx as TxRemoveDoc<Event>, control)))
    } else if (ctx._class === core.class.TxMixin) {
      result.push(...(await onEventMixin(ctx as TxMixin<Event, Event>, control)))
    }
  }

  return result
}

async function onEventMixin (ctx: TxMixin<Event, Event>, control: TriggerControl): Promise<Tx[]> {
  const ops = ctx.attributes
  const event = (await control.findAll(control.ctx, calendar.class.Event, { _id: ctx.objectId }, { limit: 1 }))[0]
  void putEventToQueue(control, 'mixin', event, ctx.modifiedBy, ops)
  if (event === undefined) return []
  if (event.access !== 'owner') return []
  const events = await control.findAll(control.ctx, calendar.class.Event, { eventId: event.eventId })
  const res: Tx[] = []
  for (const ev of events) {
    if (ev._id === event._id) continue
    const innerTx = control.txFactory.createTxMixin(ev._id, ev._class, ev.space, ctx.mixin, { ...ops })
    const outerTx = control.txFactory.createTxCollectionCUD(
      ev.attachedToClass,
      ev.attachedTo,
      ev.space,
      ev.collection,
      innerTx
    )
    res.push(outerTx)
  }
  return res
}

async function onEventUpdate (ctx: TxUpdateDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const ops = ctx.operations
  const { visibility, user, ...otherOps } = ops
  if (Object.keys(otherOps).length === 0) return []
  const event = (await control.findAll(control.ctx, calendar.class.Event, { _id: ctx.objectId }, { limit: 1 }))[0]
  if (event === undefined) return []
  if (ctx.modifiedBy !== core.account.System && event.access === 'owner') {
    void sendEventToService(event, 'update', control)
  }
  void putEventToQueue(control, 'update', event, ctx.modifiedBy, ops)
  if (event.access !== 'owner') return []
  const events = await control.findAll(control.ctx, calendar.class.Event, { eventId: event.eventId })
  const res: Tx[] = []
  const newParticipants = new Set<Ref<Person>>(event.participants as Ref<Person>[])
  const calendars = await control.findAll(control.ctx, calendar.class.Calendar, { hidden: false })
  for (const ev of events) {
    if (ev._id === event._id) continue
    const person = await getEventPerson(ev, calendars, control)
    if (person === undefined || !event.participants.includes(person)) {
      const innerTx = control.txFactory.createTxRemoveDoc(ev._class, ev.space, ev._id)
      const outerTx = control.txFactory.createTxCollectionCUD(
        ev.attachedToClass,
        ev.attachedTo,
        ev.space,
        ev.collection,
        innerTx
      )
      res.push(outerTx)
    } else {
      newParticipants.delete(person)
      const update = getDiffUpdate(ev, otherOps)
      if (Object.keys(update).length !== 0) {
        const innerTx = control.txFactory.createTxUpdateDoc(ev._class, ev.space, ev._id, update)
        const outerTx = control.txFactory.createTxCollectionCUD(
          ev.attachedToClass,
          ev.attachedTo,
          ev.space,
          ev.collection,
          innerTx
        )
        res.push(outerTx)
      }
    }
  }
  if (newParticipants.size === 0) return res
  const newPartTxs = await eventForNewParticipants(event, newParticipants, calendars, control)
  return res.concat(newPartTxs)
}

async function eventForNewParticipants (
  event: Event,
  newParticipants: Set<Ref<Person>>,
  calendars: Calendar[],
  control: TriggerControl
): Promise<Tx[]> {
  const res: Tx[] = []
  const access = AccessLevel.Reader
  const { _class, space, attachedTo, attachedToClass, collection, ...attr } = event
  const data = attr as any as Data<Event>
  for (const part of newParticipants) {
    const socialIds = await getSocialIds(control, part)
    if (socialIds.length === 0) continue
    const socialStrings = socialIds.map((si) => si._id)
    if (socialStrings.includes(event.user ?? event.createdBy ?? event.modifiedBy)) continue

    const primarySocialString = pickPrimarySocialId(socialIds)._id
    const user = primarySocialString
    const filtered = calendars.filter((c) => c.user === primarySocialString)
    const acc = await getAccountBySocialId(control, primarySocialString)
    if (acc == null) continue
    const calendar = getPrimaryCalendar(filtered, undefined, acc)
    const innerTx = control.txFactory.createTxCreateDoc(
      _class,
      space,
      { ...data, calendar, access, user },
      undefined,
      undefined,
      event.modifiedBy
    )
    const outerTx = control.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      innerTx,
      undefined,
      event.modifiedBy
    )
    res.push(outerTx)
  }
  return res
}

async function sendEventToService (
  event: Event,
  type: 'create' | 'update' | 'delete',
  control: TriggerControl
): Promise<void> {
  const url = getMetadata(serverCalendar.metadata.EndpointURL) ?? ''

  if (url === '') {
    return
  }

  const workspace = control.workspace.uuid

  try {
    await fetch(concatLink(url, '/event'), {
      method: 'POST',
      keepalive: true,
      headers: {
        Authorization: 'Bearer ' + generateToken(systemAccountUuid, workspace, { service: 'calendar' }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event,
        workspace,
        type
      })
    })
  } catch (err) {
    control.ctx.error('Could not send calendar event to service', { err })
  }
}

type EventCUDType = 'create' | 'update' | 'delete' | 'mixin'
interface EventCUDMessage {
  action: EventCUDType
  event: Event
  modifiedBy: PersonId
  changes?: Record<string, any>
}

async function putEventToQueue (
  control: TriggerControl,
  action: EventCUDType,
  event: Event,
  modifiedBy: PersonId,
  changes?: Record<string, any>
): Promise<void> {
  if (control.queue === undefined) return
  const producer = control.queue.getProducer<EventCUDMessage>(
    control.ctx.newChild('queue', {}, { span: false }),
    QueueTopic.CalendarEventCUD
  )

  try {
    await producer.send(control.ctx, control.workspace.uuid, [{ action, event, modifiedBy, changes }])
  } catch (err) {
    control.ctx.error('Could not queue calendar event', { err, action, event })
  }
}

async function onEventCreate (ctx: TxCreateDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const event = TxProcessor.createDoc2Doc(ctx)
  if (ctx.modifiedBy !== core.account.System && event.access === 'owner') {
    void sendEventToService(event, 'create', control)
  }
  void putEventToQueue(control, 'create', event, ctx.modifiedBy)
  if (event.access !== 'owner') return []
  const res: Tx[] = []
  const { _class, space, ...attr } = event
  const data = attr as any as Data<Event>
  const calendars = await control.findAll(control.ctx, calendar.class.Calendar, { hidden: false })
  const events = await control.findAll(control.ctx, calendar.class.Event, { eventId: event.eventId })
  const access = AccessLevel.Reader
  for (const part of event.participants) {
    const socialIds = await getSocialIds(control, part as Ref<Person>)
    if (socialIds.length === 0) continue
    const socialStrings = socialIds.map((si) => si._id)
    if (socialStrings.includes(event.user ?? event.createdBy ?? event.modifiedBy)) continue
    const primarySocialString = pickPrimarySocialId(socialIds)._id
    const user = primarySocialString
    const filtered = calendars.filter((c) => c.user === primarySocialString)
    const acc = await getAccountBySocialId(control, primarySocialString)
    if (acc == null) continue
    const calendar = getPrimaryCalendar(filtered, undefined, acc)
    if (events.find((p) => p.user === user) !== undefined) continue
    const innerTx = control.txFactory.createTxCreateDoc(
      _class,
      space,
      { ...data, calendar, access, user },
      undefined,
      undefined,
      ctx.modifiedBy
    )
    res.push(innerTx)
  }
  return res
}

async function onRemoveEvent (ctx: TxRemoveDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const removed = control.removedMap.get(ctx.objectId) as Event
  const res: Tx[] = []
  if (removed !== undefined) {
    if (ctx.modifiedBy !== core.account.System && removed.access === 'owner') {
      void sendEventToService(removed, 'delete', control)
    }
    void putEventToQueue(control, 'delete', removed, ctx.modifiedBy)
    if (removed.access !== 'owner') return []
    const current = await control.findAll(control.ctx, calendar.class.Event, { eventId: removed.eventId })
    for (const cur of current) {
      res.push(control.txFactory.createTxRemoveDoc(cur._class, cur.space, cur._id))
    }
  }
  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    ReminderHTMLPresenter,
    ReminderTextPresenter,
    FindReminders
  },
  trigger: {
    OnEmployee,
    OnEvent
  }
})
