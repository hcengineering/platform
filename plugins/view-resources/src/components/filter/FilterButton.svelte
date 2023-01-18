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
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, IconAdd, IconClose, Icon, showPopup, Label } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { filterStore } from '../../filter'
  import view from '../../plugin'
  import FilterTypePopup from './FilterTypePopup.svelte'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function onChange (e: Filter | undefined) {
    if (e !== undefined) $filterStore = [e]
  }

  function add (e: MouseEvent) {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        space,
        target,
        index: 1,
        onChange
      },
      target
    )
  }

  let visible: boolean
  $: {
    if (_class) {
      const clazz = hierarchy.getClass(_class)
      visible = hierarchy.hasMixin(clazz, view.mixin.ClassFilters)
    } else visible = false
  }
</script>

{#if visible}
  <Button
    size="small"
    kind={'link-bordered'}
    borderStyle={'dashed'}
    on:click={(ev) => {
      if ($filterStore.length === 0) add(ev)
      else $filterStore = []
    }}
  >
    <svelte:fragment slot="content">
      <div class="flex-row-center pointer-events-none">
        {#if $filterStore.length === 0}
          <Icon icon={IconAdd} size={'x-small'} />
          <span class="overflow-label ml-1"><Label label={view.string.Filter} /></span>
        {:else}
          <span class="overflow-label mr-1"><Label label={view.string.ClearFilters} /></span>
          <Icon icon={IconClose} size={'x-small'} />
        {/if}
      </div>
    </svelte:fragment>
  </Button>
{/if}
