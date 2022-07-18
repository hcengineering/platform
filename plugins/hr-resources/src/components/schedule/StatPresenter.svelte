<!--
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
-->
<script lang="ts">
  import { Ref } from '@anticrm/core'

  import { Request, Staff } from '@anticrm/hr'

  export let value: Staff
  export let employeeRequests: Map<Ref<Staff>, Request[]>
  export let display: (requests: Request[]) => number | string
  export let month: Date

  function getEndDate (date: Date): number {
    return new Date(date).setMonth(date.getMonth() + 1)
  }

  function getRequests (employee: Ref<Staff>, date: Date): Request[] {
    const requests = employeeRequests.get(employee)
    if (requests === undefined) return []
    const res: Request[] = []
    const time = date.getTime()
    const endTime = getEndDate(date)
    for (const request of requests) {
      if (request.date <= endTime && request.dueDate > time) {
        res.push(request)
      }
    }
    return res
  }

  $: reqs = getRequests(value._id, month)
  $: _value = display(reqs)
</script>

<span class="select-text flex lines-limit-2">{_value}</span>
