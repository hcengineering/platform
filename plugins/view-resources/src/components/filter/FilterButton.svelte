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
  import { Class, Doc, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Button, eventToHTMLElement, IconAdd, IconClose, Icon, showPopup, Label } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import view from '../../plugin'
  import FilterTypePopup from './FilterTypePopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let filters: Filter[]

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function onChange (e: Filter | undefined) {
    if (e !== undefined) filters = [e]
  }

  function add (e: MouseEvent) {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        target,
        index: 1,
        onChange
      },
      target
    )
  }

  $: clazz = hierarchy.getClass(_class)
  $: visible = hierarchy.hasMixin(clazz, view.mixin.ClassFilters)
</script>

{#if visible}
  <Button
    size="small"
    kind={'link-bordered'}
    borderStyle={'dashed'}
    on:click={(ev) => {
      if (filters.length === 0) add(ev)
      else filters = []
    }}
  >
    <svelte:fragment slot="content">
      <div class="flex-row-center">
        {#if filters.length === 0}
          <Icon icon={IconAdd} size={'x-small'} />
          <span class="ml-1"><Label label={view.string.Filter} /></span>
        {:else}
          <span class="mr-1"><Label label={view.string.ClearFilters} /></span>
          <Icon icon={IconClose} size={'x-small'} />
        {/if}
      </div>
    </svelte:fragment>
  </Button>
{/if}
