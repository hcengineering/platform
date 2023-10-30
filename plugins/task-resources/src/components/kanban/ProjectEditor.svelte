<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { Ref, Status } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ProjectType, ProjectTypeCategory } from '@hcengineering/task'

  import { statusStore } from '@hcengineering/view-resources'
  import StatesProjectEditor from '../state/StatesProjectEditor.svelte'

  export let type: ProjectType
  export let category: ProjectTypeCategory

  const client = getClient()

  let states: Status[] = []
  $: states = type.statuses.map((p) => $statusStore.byId.get(p._id)).filter((p) => p !== undefined) as Status[]

  async function onMove ({ detail: { stateID, position } }: { detail: { stateID: Ref<Status>; position: number } }) {
    const index = type.statuses.findIndex((p) => p._id === stateID)
    const state = type.statuses.splice(index, 1)[0]

    const statuses = [...type.statuses.slice(0, position), state, ...type.statuses.slice(position)]
    await client.update(type, {
      statuses
    })
  }

  async function onDelete ({ detail: { state } }: { detail: { state: Status } }) {
    const index = type.statuses.findIndex((p) => p._id === state._id)
    type.statuses.splice(index, 1)
    await client.update(type, {
      statuses: type.statuses
    })
  }
</script>

<StatesProjectEditor {type} {category} {states} on:delete={onDelete} on:move={onMove} />
