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
  import { Class, Doc, DocumentQuery, Ref } from '@anticrm/core'
  import { Button, eventToHTMLElement, IconClose, showPopup } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let filter: Filter
  let current = 0

  const dispatch = createEventDispatcher()

  function toggle () {
    const modes = filter.modes.filter((p) => p.isAvailable(filter.value))
    current++
    filter.mode = modes[current % modes.length]
    dispatch('change')
  }

  function onChange (e: Filter | undefined) {
    filter = filter
    dispatch('change')
  }
</script>

<div class="root">
  <div class="buttonWrapper">
    <Button shape={'rectangle-right'} label={filter.key.label} icon={filter.key.icon} />
  </div>
  <div class="buttonWrapper">
    <Button shape="rectangle" label={filter.mode.label} on:click={toggle} />
  </div>
  <div class="buttonWrapper">
    <Button
      shape={'rectangle'}
      label={view.string.FilterStatesCount}
      labelParams={{ value: filter.value.length }}
      on:click={(e) => {
        showPopup(
          filter.key.component,
          {
            _class,
            query,
            filter,
            onChange
          },
          eventToHTMLElement(e)
        )
      }}
    />
  </div>
  <div class="buttonWrapper">
    <Button
      shape={'rectangle-left'}
      icon={IconClose}
      on:click={() => {
        dispatch('remove')
      }}
    />
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;

    &:not(:first-child) {
      margin-left: 0.5rem;
    }
  }

  .buttonWrapper {
    margin-right: 1px;

    &:last-child {
      margin-right: 0;
    }
  }
</style>
