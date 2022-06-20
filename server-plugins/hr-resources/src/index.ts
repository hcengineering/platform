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

import contact, { Employee } from '@anticrm/contact'
import core, { Account, Ref, SortingOrder, Tx, TxFactory, TxMixin } from '@anticrm/core'
import hr, { Department, Staff } from '@anticrm/hr'
import { extractTx, TriggerControl } from '@anticrm/server-core'

async function getOldDepartment (
  currentTx: TxMixin<Employee, Staff>,
  control: TriggerControl
): Promise<Ref<Department> | undefined> {
  const txes = await control.findAll<TxMixin<Employee, Staff>>(
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

async function buildHierarchy (_id: Ref<Department>, control: TriggerControl): Promise<Ref<Department>[]> {
  const res: Ref<Department>[] = []
  if (_id === hr.ids.Head) return [hr.ids.Head]
  const department = (
    await control.findAll(hr.class.Department, {
      _id
    })
  )[0]
  if (department !== undefined) {
    const ancestors = await buildHierarchy(department.space, control)
    return [department._id, ...ancestors]
  }
  return res
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
  account: Ref<Account>,
  added: Ref<Department>[],
  removed?: Ref<Department>[]
): Tx[] {
  const pushTxes = added.map((dep) =>
    factory.createTxUpdateDoc(hr.class.Department, core.space.Space, dep, {
      $push: { members: account }
    })
  )
  if (removed === undefined) return pushTxes
  const pullTxes = removed.map((dep) =>
    factory.createTxUpdateDoc(hr.class.Department, core.space.Space, dep, {
      $pull: { members: account }
    })
  )
  return [...pullTxes, ...pushTxes]
}

/**
 * @public
 */
export async function OnDepartmentStaff (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
  if (core.class.TxMixin !== actualTx._class) {
    return []
  }
  const ctx = actualTx as TxMixin<Employee, Staff>
  if (ctx.mixin !== hr.mixin.Staff) {
    return []
  }

  const targetAccount = (
    await control.modelDb.findAll(contact.class.EmployeeAccount, {
      employee: ctx.objectId
    })
  )[0]
  if (targetAccount === undefined) return []

  if (ctx.attributes.department !== undefined) {
    const lastDepartment = await getOldDepartment(ctx, control)

    const departmentId = ctx.attributes.department
    const push = await buildHierarchy(departmentId, control)

    if (lastDepartment === undefined) {
      return getTxes(control.txFactory, targetAccount._id, push)
    }

    let removed = await buildHierarchy(lastDepartment, control)
    const added = exlude(removed, push)
    removed = exlude(push, removed)
    return getTxes(control.txFactory, targetAccount._id, added, removed)
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnDepartmentStaff
  }
})
