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
import calendar, { Calendar, Event, ExternalCalendar } from '@hcengineering/calendar'
import contactPlugin, { Employee, Person, SocialIdentity, pickPrimarySocialId } from '@hcengineering/contact'
import core, {
  Class,
  Data,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  PersonId,
  buildSocialIdString,
  parseSocialIdString,
  Ref,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { getPerson, getSocialStrings } from '@hcengineering/server-contact'
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

    const socialStrings = await getSocialStrings(control, ctx.objectId)
    if (socialStrings.length === 0) continue

    const socialString = pickPrimarySocialId(socialStrings)
    const { value } = parseSocialIdString(socialString)

    result.push(...(await createCalendar(control, socialString, value)))
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
    if (employee === undefined || !employee.active) continue

    if (await checkCalendarsExist(control, employee._id)) continue

    const socialString = buildSocialIdString(socialId)

    result.push(...(await createCalendar(control, socialString, socialId.value)))
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

async function createCalendar (control: TriggerControl, socialString: PersonId, name: string): Promise<Tx[]> {
  const res: TxCreateDoc<Calendar> = control.txFactory.createTxCreateDoc(
    calendar.class.Calendar,
    calendar.space.Calendar,
    {
      name,
      hidden: false,
      visibility: 'public'
    },
    `${socialString}_calendar` as Ref<Calendar>,
    undefined,
    socialString
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
  const person = await getPerson(control, current.createdBy ?? current.modifiedBy)

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
    }
  }

  return result
}

async function onEventUpdate (ctx: TxUpdateDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const ops = ctx.operations
  const { visibility, ...otherOps } = ops
  if (Object.keys(otherOps).length === 0) return []
  const event = (await control.findAll(control.ctx, calendar.class.Event, { _id: ctx.objectId }, { limit: 1 }))[0]
  if (event === undefined) return []
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
    const socialStrings = await getSocialStrings(control, part)
    if (socialStrings.length === 0) continue
    if (socialStrings.includes(event.createdBy ?? event.modifiedBy)) continue
    const primarySocialString = pickPrimarySocialId(socialStrings)
    const calendar = getCalendar(calendars, socialStrings)
    if (calendar === undefined) continue
    const innerTx = control.txFactory.createTxCreateDoc(
      _class,
      space,
      { ...data, calendar, access },
      undefined,
      undefined,
      primarySocialString
    )
    const outerTx = control.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      innerTx,
      undefined,
      primarySocialString
    )
    res.push(outerTx)
  }
  return res
}

async function onEventCreate (ctx: TxCreateDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const event = TxProcessor.createDoc2Doc(ctx)
  if (event.access !== 'owner') return []
  const res: Tx[] = []
  const { _class, space, attachedTo, attachedToClass, collection, ...attr } = event
  const data = attr as any as Data<Event>
  const calendars = await control.findAll(control.ctx, calendar.class.Calendar, { hidden: false })
  const access = 'reader'
  for (const part of event.participants) {
    const socialStrings = await getSocialStrings(control, part as Ref<Person>)
    if (socialStrings.length === 0) continue
    if (socialStrings.includes(event.createdBy ?? event.modifiedBy)) continue
    const primarySocialString = pickPrimarySocialId(socialStrings)
    const calendar = getCalendar(calendars, socialStrings)
    if (calendar === undefined) continue
    const innerTx = control.txFactory.createTxCreateDoc(
      _class,
      space,
      { ...data, calendar, access },
      undefined,
      undefined,
      primarySocialString
    )
    const outerTx = control.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      innerTx,
      undefined,
      primarySocialString
    )
    res.push(outerTx)
  }
  return res
}

async function onRemoveEvent (ctx: TxRemoveDoc<Event>, control: TriggerControl): Promise<Tx[]> {
  const removed = control.removedMap.get(ctx.objectId) as Event
  const res: Tx[] = []
  if (removed !== undefined) {
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
