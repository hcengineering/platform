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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Separator, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { onDestroy } from 'svelte'
  import card from '../plugin'
  import Navigator from './Navigator.svelte'

  export let currentSpace: Ref<Class<Doc>>

  let classes: MasterTag[] = []
  let allClasses: MasterTag[] = []

  function fillClasses (tags: MasterTag[]): void {
    classes = tags.filter((it) => it.extends === card.class.Card).sort((a, b) => a.label.localeCompare(b.label))
  }

  const query = createQuery()
  query.query(card.class.MasterTag, {}, (res) => {
    const notRemoved = res.filter((it) => it.removed !== true)
    allClasses = notRemoved
    fillClasses(notRemoved)
  })

  $: clazz = allClasses.find((it) => it._id === currentSpace)

  $: label = getLabel(clazz)

  function getLabel (clazz: MasterTag | undefined): IntlString | undefined {
    return clazz?.label
  }

  let replacedPanel: HTMLElement
  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

<div class="hulyPanels-container">
  {#if $deviceInfo.navigator.visible}
    <Navigator _class={clazz?._id} {classes} {allClasses} />
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
    {#if clazz !== undefined && label !== undefined}
      <SpecialView _class={clazz._id} {label} icon={card.icon.Card} />
    {/if}
  </div>
</div>
