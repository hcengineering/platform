<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { Component, Issue, Project } from '@hcengineering/tracker'
  import { Button, Label } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import ComponentPresenter from '../../components/ComponentPresenter.svelte'

  export let issues: Issue[]
  export let targetProject: Project
  export let components: Component[]

  const client = getClient()

  $: missingComponents = (
    issues
      .map((it) => it.component)
      .filter((it) => it != null)
      .map((it) => components.find((cit) => cit._id === it)) as Component[]
  ).filter((it, idx, arr) => {
    const targetComponent = components.find((it2) => it2.space === targetProject._id && it2.label === it.label)

    return targetComponent === undefined && arr.indexOf(it) === idx
  })

  async function createMissingComponent (cur: Component): Promise<void> {
    await client.createDoc(cur._class, targetProject._id, {
      label: cur.label,
      attachments: 0,
      description: cur.description,
      comments: 0,
      lead: cur.lead
    })
  }
</script>

{#if missingComponents.length > 0}
  <div class="mt-2">
    <Label label={tracker.string.Component} />
  </div>
  <div class="flex-col">
    {#each missingComponents as comp}
      <div class="status-option p-1 flex-row-center flex-between">
        <div class="side-columns aligned-text">
          <ComponentPresenter value={comp} disabled />
        </div>
        <div class="side-columns">
          <Button label={tracker.string.CreateComponent} on:click={() => createMissingComponent(comp)} />
        </div>
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .side-columns {
    width: 50%;
  }
  .aligned-text {
    display: flex;
    align-items: center;
  }
</style>
