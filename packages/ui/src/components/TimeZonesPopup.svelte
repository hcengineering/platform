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
  import { createEventDispatcher } from 'svelte'
  import ui, {
    deviceOptionsStore,
    IconSearch,
    IconAdd,
    Button,
    Label,
    resizeObserver,
    EditWithIcon,
    IconClose,
    TimeZone,
    IconChevronDown,
    ActionIcon,
    IconUndo
  } from '..'

  interface TimeZoneGroup {
    continent: string
    collapsed: boolean
  }

  export let selected: string
  export let timeZones: TimeZone[] = []
  export let count: number
  export let reset: string | null
  export let withAdd: boolean = true

  const dispatch = createEventDispatcher()

  let search: string = ''
  let selectedTZ: TimeZone | null
  $: selectedTZ = selected === undefined ? null : timeZones.filter((tz) => tz.id === selected)[0]
  const tzGroups = new Map<string, TimeZone[]>()
  let groups: TimeZoneGroup[] = []

  const updateTimeZones = (s: string, id: string): void => {
    tzGroups.clear()
    const newGroups: TimeZoneGroup[] = []
    const searchedTZ: TimeZone[] =
      s === '' ? timeZones : timeZones.filter((tz) => tz.city.toLowerCase().includes(s.toLowerCase()))
    if (searchedTZ.length > 0) {
      searchedTZ.forEach((tz) => {
        const temp = tzGroups.get(tz.continent)
        if (tz.id === id) selectedTZ = tz
        else if (temp === undefined) {
          tzGroups.set(tz.continent, [tz])
          newGroups.push({
            continent: tz.continent,
            collapsed: s === ''
          })
        } else tzGroups.set(tz.continent, [...temp, tz])
      })
    }
    groups = newGroups
  }
  $: updateTimeZones(search, selected)
</script>

<div
  class="selectPopup"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      placeholder={ui.string.SearchDots}
    />
  </div>
  {#if selectedTZ}
    <div class="header flex-col">
      <div class="flex-between min-h-4" style:margin-right={'-.5rem'}>
        <span class="text-xs font-medium uppercase content-darker-color flex-grow"
          ><Label label={ui.string.Selected} /></span
        >
        {#if reset !== null}
          <ActionIcon
            icon={IconUndo}
            size={'x-small'}
            action={async () => {
              if (reset !== null) selected = reset
              reset = null
              dispatch('update', 'reset')
            }}
          />
        {/if}
        {#if count > 1}
          <ActionIcon
            icon={IconClose}
            size={'x-small'}
            action={async () => {
              dispatch('close', 'delete')
            }}
          />
        {/if}
      </div>
      <div class="flex-row-center mt-1 overflow-label">
        <span class="label font-medium caption-color">{selectedTZ.short}</span>
        &nbsp;({selectedTZ.continent})
      </div>
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      {#if groups.length > 0}
        {#each groups as cont, i}
          {@const items = tzGroups.get(cont.continent)}
          {#if items}
            {#if i > 0}<div class="menu-separator" />{/if}
            <div class="sticky-wrapper">
              <button
                class="menu-group__header"
                class:show={!cont.collapsed}
                on:click={() => (cont.collapsed = !cont.collapsed)}
              >
                <div class="flex-row-center">
                  <div class="chevron">
                    <IconChevronDown size={'small'} filled />
                  </div>
                  <span class="ml-2">{cont.continent}</span>
                </div>
              </button>
              <div class="menu-group">
                {#each items as item}
                  <button class="menu-item no-focus items-center" on:click={() => dispatch('close', item.id)}>
                    <span class="overflow-label label flex-grow">{item.city}</span>
                    {#if withAdd}
                      <div class="tool ml-2">
                        <Button
                          icon={IconAdd}
                          size={'small'}
                          kind={'ghost'}
                          disabled={count > 4}
                          on:click={() => {
                            count++
                            dispatch('update', item.id)
                          }}
                        />
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {:else}
        <div class="empty">
          <Label label={ui.string.NoTimeZonesFound} />
        </div>
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 5rem;
    font-size: 0.75rem;
    color: var(--theme-dark-color);
  }
</style>
