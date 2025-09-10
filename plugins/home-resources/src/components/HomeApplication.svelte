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
  import { Separator, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { getCurrentAccount } from '@hcengineering/core'
  import view from '@hcengineering/view'
  import chat from '@hcengineering/chat'
  import { getClient } from '@hcengineering/presentation'

  import Navigator from './Navigator.svelte'
  import Home from './Home.svelte'
  import plugin from '../plugin'
  import { Special } from '../types'

  export let currentSpace: string

  let replacedPanel: HTMLElement
  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))

  const myAcc = getCurrentAccount()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const threadClass = hierarchy.getClass(chat.masterTag.Thread)

  const allSection: Special = {
    _id: 'all',
    icon: plugin.icon.All,
    label: plugin.string.All,
    baseQuery: {}
  }

  const specials: Special[] = [
    allSection,
    {
      _id: 'threads',
      icon: threadClass.icon ?? plugin.icon.Thread,
      label: plugin.string.Threads,
      baseQuery: {},
      baseClass: chat.masterTag.Thread
    },
    {
      _id: 'createdByMe',
      icon: plugin.icon.Person,
      label: plugin.string.CreatedByMe,
      baseQuery: { createdBy: { $in: myAcc.socialIds } }
    }
  ]

  $: selectedSpecial = specials.find((s) => s._id === currentSpace) ?? allSection
</script>

<div class="hulyPanels-container">
  {#if $deviceInfo.navigator.visible}
    <Navigator currentSpace={currentSpace ?? allSection._id} {specials} />
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
    <Home
      baseQuery={selectedSpecial?.baseQuery ?? {}}
      baseClass={selectedSpecial?.baseClass}
      header={selectedSpecial?.label}
    />
  </div>
</div>
