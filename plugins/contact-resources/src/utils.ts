//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import contact, { ChannelProvider, Employee, formatName } from '@hcengineering/contact'
import { Doc, ObjQueryType, Ref, Timestamp, toIdMap } from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import view, { Filter } from '@hcengineering/view'
import { FilterQuery } from '@hcengineering/view-resources'

const client = getClient()
const channelProviders = client.findAll(contact.class.ChannelProvider, {})

export async function getChannelProviders (): Promise<Map<Ref<ChannelProvider>, ChannelProvider>> {
  const cp = await channelProviders
  const map = new Map<Ref<ChannelProvider>, ChannelProvider>()
  for (const provider of cp) {
    map.set(provider._id, provider)
  }
  return map
}

export function formatDate (dueDateMs: Timestamp): string {
  return new Date(dueDateMs).toLocaleString('default', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export async function employeeSort (value: Array<Ref<Employee>>): Promise<Array<Ref<Employee>>> {
  return await new Promise((resolve) => {
    const query = createQuery(true)
    query.query(contact.class.Employee, { _id: { $in: value } }, (res) => {
      const employees = toIdMap(res)
      value.sort((a, b) => {
        const employeeId1 = a as Ref<Employee> | null | undefined
        const employeeId2 = b as Ref<Employee> | null | undefined

        if (employeeId1 == null && employeeId2 != null) {
          return 1
        }

        if (employeeId1 != null && employeeId2 == null) {
          return -1
        }

        if (employeeId1 != null && employeeId2 != null) {
          const name1 = formatName(employees.get(employeeId1)?.name ?? '')
          const name2 = formatName(employees.get(employeeId2)?.name ?? '')

          return name1.localeCompare(name2)
        }

        return 0
      })
      resolve(value)
      query.unsubscribe()
    })
  })
}

export async function filterChannelInResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $in: result }
}

export async function filterChannelNinResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $nin: result }
}

export async function getRefs (filter: Filter, onUpdate: () => void): Promise<Array<Ref<Doc>>> {
  const lq = FilterQuery.getLiveQuery(filter.index)
  const client = getClient()
  const mode = await client.findOne(view.class.FilterMode, { _id: filter.mode })
  if (mode === undefined) return []
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    const refresh = lq.query(
      contact.class.Channel,
      {
        provider: { $in: filter.value }
      },
      (refs) => {
        const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
        FilterQuery.results.set(filter.index, result)
        resolve(result)
        onUpdate()
      }
    )
    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}
