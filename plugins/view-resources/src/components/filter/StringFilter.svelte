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
  import { translate } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Button, resizeObserver, deviceOptionsStore } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { onMount, createEventDispatcher } from 'svelte'
  import view from '../../plugin'

  export let filter: Filter
  export let onChange: (e: Filter) => void

  const dispatch = createEventDispatcher()

  let searchInput: HTMLInputElement
  let search = filter.value[0] ?? ''
  let phTraslate = ''

  filter.modes = [view.filter.FilterContains]
  filter.mode ??= filter.modes[0]

  export function onKeyDown (event: KeyboardEvent): boolean {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()

      save()

      return true
    }
    return false
  }

  function save () {
    filter.value = search ? [search] : []

    onChange(filter)
    dispatch('close')
  }

  $: translate(filter.key.label, {}).then((res) => {
    phTraslate = res
  })

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')} on:keydown={onKeyDown}>
  <div class="header">
    <input bind:this={searchInput} bind:value={search} type="text" placeholder={phTraslate} />
  </div>
  <Button shape="filter" label={view.string.Apply} on:click={save} />
</div>
