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
  import core from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Process, State } from '@hcengineering/process'
  import { Button, IconAdd, Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import StateInlineEditor from './StateInlineEditor.svelte'

  export let process: Process
  export let states: State[]
  export let readonly: boolean

  const client = getClient()

  async function addState (): Promise<void> {
    await client.createDoc(plugin.class.State, core.space.Model, {
      process: process._id,
      title: await translate(plugin.string.NewState, {})
    })
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="hulyTableAttr-container flex-col-center box">
  <div class="header w-full p-4">
    <Label label={plugin.string.States} />
  </div>
  {#each states as state (state._id)}
    <StateInlineEditor value={state} />
  {/each}
  {#if !readonly}
    <Button kind={'ghost'} width={'100%'} icon={IconAdd} label={plugin.string.AddState} on:click={addState} />
  {/if}
</div>

<style lang="scss">
  .box {
    width: 32rem;
    align-self: center;
  }

  .header {
    font-weight: 500;
    font-size: 1rem;
    color: var(--theme-caption-color);
    user-select: none;
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
