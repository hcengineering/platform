<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { MasterTag } from '@hcengineering/card'
  import core, { generateId, Ref } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Process, State } from '@hcengineering/process'
  import { ButtonIcon, getCurrentLocation, Icon, IconAdd, Label, navigate } from '@hcengineering/ui'
  import process from '../plugin'
  import { makeRank } from '@hcengineering/rank'

  export let masterTag: MasterTag

  const client = getClient()

  async function add (): Promise<void> {
    const initState = generateId<State>()
    const id = await client.createDoc(process.class.Process, core.space.Model, {
      name: await translate(process.string.NewProcess, {}),
      masterTag: masterTag._id,
      context: {},
      description: ''
    })
    await client.createDoc(
      process.class.State,
      core.space.Model,
      {
        process: id,
        rank: makeRank(undefined, undefined),
        title: await translate(process.string.NewState, {})
      },
      initState
    )
    await client.createDoc(process.class.Transition, core.space.Model, {
      process: id,
      from: null,
      to: initState,
      trigger: process.trigger.OnExecutionStart,
      rank: makeRank(undefined, undefined),
      actions: [],
      triggerParams: {}
    })
    handleSelect(id)
  }

  let processes: Process[] = []

  const query = createQuery()

  query.query(
    process.class.Process,
    {
      masterTag: masterTag._id
    },
    (res) => {
      processes = res
    }
  )

  function handleSelect (id: Ref<Process>): void {
    const loc = getCurrentLocation()
    loc.path[5] = process.component.ProcessEditor
    loc.path[6] = id
    navigate(loc, true)
  }
</script>

<div class="hulyTableAttr-header font-medium-12">
  <Icon icon={process.icon.Process} size="small" />
  <span><Label label={process.string.Processes} /></span>
  <ButtonIcon kind="primary" icon={IconAdd} size="small" dataId={'btnAdd'} on:click={add} />
</div>
{#if processes.length}
  <div class="hulyTableAttr-content task">
    {#each processes as val}
      <button
        class="hulyTableAttr-content__row justify-start"
        on:click|stopPropagation={() => {
          handleSelect(val._id)
        }}
      >
        <div class="hulyTableAttr-content__row-label px-2 font-medium-14 cursor-pointer">
          {val.name}
        </div>
      </button>
    {/each}
  </div>
{/if}
