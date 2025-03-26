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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { createQuery } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Separator, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { onDestroy } from 'svelte'
  import plugin from '../plugin'
  import { Special } from '../types'
  import Navigator from './Navigator.svelte'
  import RunProcessCardPopup from './RunProcessCardPopup.svelte'

  export let currentSpace: string

  const query = createQuery()
  let processes: Process[] = []
  query.query(plugin.class.Process, {}, (res) => {
    processes = res
  })

  $: selectedProcess = processes.find((p) => p._id === currentSpace)

  let replacedPanel: HTMLElement
  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))

  const specials: Special[] = [
    {
      _id: 'all',
      label: plugin.string.AllProcesses,
      baseQuery: {}
    },
    {
      _id: 'my',
      label: plugin.string.MyProcesses,
      baseQuery: {
        assignee: getCurrentEmployee()
      }
    }
  ]

  $: selectedSpecial = specials.find((s) => s._id === currentSpace)
  $: baseQuery =
    selectedProcess !== undefined
      ? { process: selectedProcess._id }
      : selectedSpecial !== undefined
        ? selectedSpecial.baseQuery
        : {}
</script>

<div class="hulyPanels-container">
  {#if $deviceInfo.navigator.visible}
    <Navigator {processes} {currentSpace} {specials} />
    <Separator
      name={'workbench'}
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}

  <div class="hulyComponent" bind:this={replacedPanel}>
    <SpecialView
      _class={plugin.class.Execution}
      label={plugin.string.Processes}
      icon={plugin.icon.Process}
      {baseQuery}
      createLabel={plugin.string.RunProcess}
      createComponent={plugin.component.RunProcessCardPopup}
      createComponentProps={{ value: selectedProcess?._id }}
    />
  </div>
</div>
