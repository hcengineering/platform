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

import contact, { Contact, Employee, formatName, getName, Person, PersonAccount } from '@hcengineering/contact'
import core, {
  Doc,
  Ref,
  SortingOrder,
  toIdMap,
  Tx,
  TxCreateDoc,
  TxFactory,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import gmail from '@hcengineering/gmail'
import hr, {
  Department,
  DepartmentMember,
  fromTzDate,
  PublicHoliday,
  Request,
  Staff,
  tzDateEqual
} from '@hcengineering/hr'
import notification, { NotificationType } from '@hcengineering/notification'
import { translate } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { sendEmailNotification } from '@hcengineering/server-gmail-resources'
import { getEmployee, getPersonAccountById } from '@hcengineering/server-notification'
import {
  getContentByTemplate,
  getNotificationProviderControl,
  isAllowed
} from '@hcengineering/server-notification-resources'

async function getOldDepartment (
  currentTx: TxMixin<Employee, Staff>,
  control: TriggerControl
): Promise<Ref<Department> | undefined> {
  const txes = await control.findAll<TxMixin<Employee, Staff>>(
    control.ctx,
    core.class.TxMixin,
    {
      objectId: currentTx.objectId
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )
  let lastDepartment: Ref<Department> | undefined
  for (const tx of txes) {
    if (tx._id === currentTx._id) continue
    if (tx.attributes?.department !== undefined) {
      lastDepartment = tx.attributes.department
    }
  }
  return lastDepartment
}

async function buildHierarchy (_id: Ref<Department>, control: TriggerControl): Promise<Department[]> {
  const res: Department[] = []
  const ancestors = new Map<Ref<Department>, Ref<Department>>()
  const departments = await control.queryFind(control.ctx, hr.class.Department, {})
  for (const department of departments) {
    if (department._id === hr.ids.Head || department.parent === undefined) continue
    ancestors.set(department._id, department.parent)
  }
  const departmentsMap = toIdMap(departments)
  while (true) {
    const department = departmentsMap.get(_id)
    if (department === undefined) return res
    res.push(department)
    const next = ancestors.get(department._id)
    if (next === undefined) return res
    _id = next
  }
}

function exlude (first: Ref<Department>[], second: Ref<Department>[]): Ref<Department>[] {
  const set = new Set(first)
  const res: Ref<Department>[] = []
  for (const department of second) {
    if (!set.has(department)) {
      res.push(department)
    }
  }
  return res
}

function getTxes (
  factory: TxFactory,
  account: Ref<DepartmentMember>[],
  added: Ref<Department>[],
  removed?: Ref<Department>[]
): Tx[] {
  const pushTxes = added
    .map((dep) =>
      account.map((it) =>
        factory.createTxUpdateDoc(hr.class.Department, core.space.Workspace, dep, {
          $push: { members: it }
        })
      )
    )
    .flat()
  if (removed === undefined) return pushTxes
  const pullTxes = removed
    .map((dep) =>
      account.map((it) =>
        factory.createTxUpdateDoc(hr.class.Department, core.space.Workspace, dep, {
          $pull: { members: it }
        })
      )
    )
    .flat()
  return [...pullTxes, ...pushTxes]
}

/**
 * @public
 */
export async function OnDepartmentStaff (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxMixin<Employee, Staff>

    const targetAccount = control.modelDb.getAccountByPersonId(ctx.objectId) as PersonAccount[]
    if (targetAccount.length === 0) {
      continue
    }

    if (ctx.attributes.department !== undefined) {
      const lastDepartment = await getOldDepartment(ctx, control)

      const departmentId = ctx.attributes.department
      if (departmentId === null) {
        if (lastDepartment !== undefined) {
          const removed = await buildHierarchy(lastDepartment, control)
          result.push(
            ...getTxes(
              control.txFactory,
              targetAccount.map((it) => it._id),
              [],
              removed.map((p) => p._id)
            )
          )
        }
      }
      const push = (await buildHierarchy(departmentId, control)).map((p) => p._id)

      if (lastDepartment === undefined) {
        result.push(
          ...getTxes(
            control.txFactory,
            targetAccount.map((it) => it._id),
            push
          )
        )
      } else {
        let removed = (await buildHierarchy(lastDepartment, control)).map((p) => p._id)
        const added = exlude(removed, push)
        removed = exlude(push, removed)
        result.push(
          ...getTxes(
            control.txFactory,
            targetAccount.map((it) => it._id),
            added,
            removed
          )
        )
      }
    }
  }

  return result
}

/**
 * @public
 */
export async function OnDepartmentRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxRemoveDoc<Department>

    const department = control.removedMap.get(ctx.objectId) as Department
    if (department === undefined) {
      continue
    }
    const nested = await control.findAll(control.ctx, hr.class.Department, { parent: department._id })
    for (const dep of nested) {
      result.push(control.txFactory.createTxRemoveDoc(dep._class, dep.space, dep._id))
    }
    const targetAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
      _id: { $in: department.members }
    })
    const employeeIds = targetAccounts.map((acc) => acc.person as Ref<Staff>)

    const employee = await control.findAll(control.ctx, contact.mixin.Employee, {
      _id: { $in: employeeIds }
    })
    const removed = await buildHierarchy(department._id, control)
    employee.forEach((em) => {
      result.push(
        control.txFactory.createTxMixin(em._id, em._class, em.space, hr.mixin.Staff, { department: undefined })
      )
    })
    result.push(
      ...getTxes(
        control.txFactory,
        targetAccounts.map((it) => it._id),
        [],
        removed.map((p) => p._id)
      )
    )
  }
  return result
}

/**
 * @public
 */
export async function OnEmployee (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxMixin<Person, Employee>

    const person = (await control.findAll(control.ctx, contact.class.Person, { _id: ctx.objectId }))[0]
    if (person === undefined) {
      continue
    }

    const employee = control.hierarchy.as(person, ctx.mixin)
    if (control.hierarchy.hasMixin(person, hr.mixin.Staff) || !employee.active) {
      continue
    }

    result.push(
      control.txFactory.createTxMixin(ctx.objectId, ctx.objectClass, ctx.objectSpace, hr.mixin.Staff, {
        department: hr.ids.Head
      })
    )
  }
  return result
}

/**
 * @public
 */
export async function OnEmployeeDeactivate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = TxProcessor.extractTx(tx)
    if (core.class.TxMixin !== actualTx._class) {
      continue
    }
    const ctx = actualTx as TxMixin<Person, Employee>
    if (ctx.mixin !== contact.mixin.Employee || ctx.attributes.active !== false) {
      continue
    }

    const targetAccount = control.modelDb.getAccountByPersonId(ctx.objectId) as PersonAccount[]
    if (targetAccount.length === 0) {
      continue
    }
    const set = new Set(targetAccount.map((it) => it._id))

    const departments = await control.queryFind(control.ctx, hr.class.Department, {})
    const removed = departments.filter((dep) => dep.members.some((p) => set.has(p)))
    result.push(
      ...getTxes(
        control.txFactory,
        targetAccount.map((it) => it._id),
        [],
        removed.map((p) => p._id)
      )
    )
  }
  return result
}

// TODO: why we need specific email notifications instead of using general flow?
async function sendEmailNotifications (
  control: TriggerControl,
  sender: PersonAccount,
  doc: Request | PublicHoliday,
  space: Ref<Department>,
  typeId: Ref<NotificationType>
): Promise<void> {
  const contacts = new Set<Ref<Contact>>()
  const departments = await buildHierarchy(space, control)
  for (const department of departments) {
    if (department.subscribers === undefined) continue
    for (const subscriber of department.subscribers) {
      contacts.add(subscriber)
    }
  }

  // should respect employee settings
  const type = await control.modelDb.findOne(notification.class.NotificationType, { _id: typeId })
  if (type === undefined) return
  const provider = await control.modelDb.findOne(notification.class.NotificationProvider, {
    _id: gmail.providers.EmailNotificationProvider
  })
  if (provider === undefined) return

  const notificationControl = await getNotificationProviderControl(control.ctx, control)
  for (const accountId of contacts.values()) {
    const accounts = control.modelDb.getAccountByPersonId(accountId) as PersonAccount[]
    for (const account of accounts) {
      const allowed = isAllowed(control, account._id, type, provider, notificationControl)
      if (!allowed) {
        contacts.delete(account.person)
      }
    }
  }

  const channels = await control.findAll(control.ctx, contact.class.Channel, {
    provider: contact.channelProvider.Email,
    attachedTo: { $in: Array.from(contacts) }
  })

  const senderPerson = (await control.findAll(control.ctx, contact.class.Person, { _id: sender.person }))[0]

  const senderName = senderPerson !== undefined ? formatName(senderPerson.name, control.branding?.lastNameFirst) : ''
  const content = await getContentByTemplate(doc, senderName, type._id, control, '')
  if (content === undefined) return

  for (const channel of channels) {
    await sendEmailNotification(control.ctx, content.text, content.html, content.subject, channel.value)
  }
}

/**
 * @public
 */
export async function OnRequestCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Request>

    const sender = getPersonAccountById(ctx.modifiedBy, control)
    if (sender === undefined) {
      continue
    }

    const request = TxProcessor.createDoc2Doc(ctx)

    await sendEmailNotifications(control, sender, request, request.department, hr.ids.CreateRequestNotification)
  }
  return []
}

/**
 * @public
 */
export async function OnRequestUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxUpdateDoc<Request>

    const sender = getPersonAccountById(ctx.modifiedBy, control)
    if (sender === undefined) {
      continue
    }

    const request = (await control.findAll(control.ctx, hr.class.Request, { _id: ctx.objectId }))[0] as Request
    if (request === undefined) {
      continue
    }

    await sendEmailNotifications(control, sender, request, request.department, hr.ids.UpdateRequestNotification)
  }
  return []
}

/**
 * @public
 */
export async function OnRequestRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Request>

    const sender = getPersonAccountById(ctx.modifiedBy, control)
    if (sender === undefined) {
      continue
    }

    const request = control.removedMap.get(ctx.objectId) as Request
    if (request === undefined) {
      continue
    }

    await sendEmailNotifications(control, sender, request, request.department, hr.ids.RemoveRequestNotification)
  }
  return []
}

/**
 * @public
 */
export async function RequestHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const request = doc as Request
  const employee = (await control.findAll(control.ctx, contact.mixin.Employee, { _id: request.attachedTo }))[0]
  const who = getName(control.hierarchy, employee, control.branding?.lastNameFirst)
  const type = await translate(control.modelDb.getObject(request.type).label, {})

  const date = tzDateEqual(request.tzDate, request.tzDueDate)
    ? `on ${new Date(fromTzDate(request.tzDate)).toLocaleDateString()}`
    : `from ${new Date(fromTzDate(request.tzDate)).toLocaleDateString()} to ${new Date(
        fromTzDate(request.tzDueDate)
      ).toLocaleDateString()}`

  return `${who} - ${type.toLowerCase()} ${date}`
}

/**
 * @public
 */
export async function RequestTextPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const request = doc as Request
  const employee = (await control.findAll(control.ctx, contact.mixin.Employee, { _id: request.attachedTo }))[0]
  const who = getName(control.hierarchy, employee, control.branding?.lastNameFirst)
  const type = await translate(control.modelDb.getObject(request.type).label, {})

  const date = tzDateEqual(request.tzDate, request.tzDueDate)
    ? `on ${new Date(fromTzDate(request.tzDate)).toLocaleDateString()}`
    : `from ${new Date(fromTzDate(request.tzDate)).toLocaleDateString()} to ${new Date(
        fromTzDate(request.tzDueDate)
      ).toLocaleDateString()}`

  return `${who} - ${type.toLowerCase()} ${date}`
}

/**
 * @public
 */
export async function OnPublicHolidayCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<PublicHoliday>

    const sender = getPersonAccountById(ctx.modifiedBy, control)
    if (sender === undefined) {
      continue
    }
    const employee = await getEmployee(sender.person as Ref<Employee>, control)
    if (employee === undefined) {
      continue
    }

    const publicHoliday = TxProcessor.createDoc2Doc(ctx)
    await sendEmailNotifications(
      control,
      sender,
      publicHoliday,
      publicHoliday.department,
      hr.ids.CreatePublicHolidayNotification
    )
  }
  return result
}

/**
 * @public
 */
export async function PublicHolidayHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const holiday = doc as PublicHoliday
  const sender = getPersonAccountById(holiday.modifiedBy, control)
  if (sender === undefined) return ''
  const employee = await getEmployee(sender.person as Ref<Employee>, control)
  if (employee === undefined) return ''
  const who = formatName(employee.name, control.branding?.lastNameFirst)

  const date = `on ${new Date(fromTzDate(holiday.date)).toLocaleDateString()}`

  return `${holiday.title} ${date}<br/>${holiday.description}<br/>Set by ${who}`
}

/**
 * @public
 */
export async function PublicHolidayTextPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const holiday = doc as PublicHoliday
  const sender = getPersonAccountById(holiday.modifiedBy, control)
  if (sender === undefined) return ''
  const employee = await getEmployee(sender.person as Ref<Employee>, control)
  if (employee === undefined) return ''
  const who = formatName(employee.name, control.branding?.lastNameFirst)

  const date = `on ${new Date(fromTzDate(holiday.date)).toLocaleDateString()}`

  return `${holiday.title} ${date}. ${holiday.description}. Set by ${who}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnEmployee,
    OnRequestCreate,
    OnRequestUpdate,
    OnRequestRemove,
    OnDepartmentStaff,
    OnDepartmentRemove,
    OnEmployeeDeactivate,
    OnPublicHolidayCreate
  },
  function: {
    RequestHTMLPresenter,
    RequestTextPresenter,
    PublicHolidayHTMLPresenter,
    PublicHolidayTextPresenter
  }
})
