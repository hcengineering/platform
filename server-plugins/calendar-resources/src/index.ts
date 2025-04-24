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
import calendar, { Calendar, Event, ExternalCalendar } from '@hcengineering/calendar'
import contactPlugin, { Employee, Person, SocialIdentity } from '@hcengineering/contact'
import core, {
  Class,
  concatLink,
  Data,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  PersonId,
  Ref,
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  AccountUuid,
  pickPrimarySocialId
} from '@hcengineering/core'
import serverCalendar from '@hcengineering/server-calendar'
import { getMetadata, getResource } from '@hcengineering/platform'
import { QueueTopic, TriggerControl } from '@hcengineering/server-core'
import { getPerson, getSocialStrings, getSocialIds } from '@hcengineering/server-contact'
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

    result.push(...(await createCalendar(control, employee.personUuid, socialId, socialId)))
  }

  return result
}

export async function OnSocialIdentityCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxCUD<SocialIdentity>
    if (ctx._class !== core.class.TxCreateDoc) continue

    const socialId = TxProcessor.createDoc2Doc(ctx as TxCreateDoc<SocialIdentity>)
    const employee = (
      await control.findAll(control.ctx, contactPlugin.mixin.Employee, { _id: socialId.attachedTo as Ref<Employee> })
    )[0]
    if (employee === undefined || !employee.active || employee.personUuid === undefined) continue

    if (await checkCalendarsExist(control, employee._id)) continue

    result.push(...(await createCalendar(control, employee.personUuid, socialId._id, socialId.value)))
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

async function createCalendar (
  control: TriggerControl,
  account: AccountUuid,
  socialId: PersonId,
  name: string
): Promise<Tx[]> {
  const res: TxCreateDoc<Calendar> = control.txFactory.createTxCreateDoc(
    calendar.class.Calendar,
    calendar.space.Calendar,
    {
      name,
      hidden: false,
      visibility: 'public'
    },
    `${account}_calendar` as Ref<Calendar>,
    undefined,
    socialId
  )
  return [res]
}

function getCalendar (calendars: Calendar[], person: PersonId[]): Ref<Calendar> | undefined {
  const filtered = calendars.filter((c) => person.includes(c.createdBy ?? c.modifiedBy))
  const defaultExternal = filtered.find((c) => (c as ExternalCalendar).default)
  if (defaultExternal !== undefined) return defaultExternal._id
  return filtered[0]?._id
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
  const { visibility, ...otherOps } = ops
  if (Object.keys(otherOps).length === 0) return []
  const event = (await control.findAll(control.ctx, calendar.class.Event, { _id: ctx.objectId }, { limit: 1 }))[0]
  if (event === undefined) return []
  if (ctx.modifiedBy !== core.account.System) {
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
      const innerTx = control.txFactory.createTxUpdateDoc(ev._class, ev.space, ev._id, { ...otherOps })
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
  const access = 'reader'
  const { _class, space, attachedTo, attachedToClass, collection, ...attr } = event
  const data = attr as any as Data<Event>
  for (const part of newParticipants) {
    const socialIds = await getSocialIds(control, part)
    if (socialIds.length === 0) continue
    const socialStrings = socialIds.map((si) => si._id)
    if (socialStrings.includes(event.user ?? event.createdBy ?? event.modifiedBy)) continue

    const primarySocialString = pickPrimarySocialId(socialIds)._id
    const user = primarySocialString
    const calendar = getCalendar(calendars, socialStrings)
    if (calendar === undefined) continue
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
        Authorization: 'Bearer ' + generateToken(systemAccountUuid, workspace),
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
    control.ctx.newChild('queue', {}),
    QueueTopic.CalendarEventCUD
  )

  try {
    await producer.send(control.workspace.uuid, [{ action, event, modifiedBy, changes }])
  } catch (err) {
    control.ctx.error('Could not queue calendar event', { err, action, event })
  }
}

async function onEventCreate (ctx: TxCreateDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const event = TxProcessor.createDoc2Doc(ctx)
  if (ctx.modifiedBy !== core.account.System) {
    void sendEventToService(event, 'create', control)
  }
  void putEventToQueue(control, 'create', event, ctx.modifiedBy)
  if (event.access !== 'owner') return []
  const res: Tx[] = []
  const { _class, space, attachedTo, attachedToClass, collection, ...attr } = event
  const data = attr as any as Data<Event>
  const calendars = await control.findAll(control.ctx, calendar.class.Calendar, { hidden: false })
  const access = 'reader'
  for (const part of event.participants) {
    const socialIds = await getSocialIds(control, part as Ref<Person>)
    if (socialIds.length === 0) continue
    const socialStrings = socialIds.map((si) => si._id)
    if (socialStrings.includes(event.user ?? event.createdBy ?? event.modifiedBy)) continue
    const primarySocialString = pickPrimarySocialId(socialIds)._id
    const user = primarySocialString
    const calendar = getCalendar(calendars, socialStrings)
    if (calendar === undefined) continue
    const innerTx = control.txFactory.createTxCreateDoc(
      _class,
      space,
      { ...data, calendar, access, user },
      undefined,
      undefined,
      ctx.modifiedBy
    )
    const outerTx = control.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      innerTx,
      undefined,
      ctx.modifiedBy
    )
    res.push(outerTx)
  }
  return res
}

async function onRemoveEvent (ctx: TxRemoveDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const removed = control.removedMap.get(ctx.objectId) as Event
  const res: Tx[] = []
  if (removed !== undefined) {
    if (ctx.modifiedBy !== core.account.System) {
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
    OnSocialIdentityCreate,
    OnEmployee,
    OnEvent
  }
})
