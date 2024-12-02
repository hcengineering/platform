<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Widget, WidgetPreference, WidgetType } from '@hcengineering/workbench'
  import { IconSettings, ModernButton, showPopup, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'

  import WidgetPresenter from './/WidgetPresenter.svelte'
  import AddWidgetsPopup from './AddWidgetsPopup.svelte'
  import { minimizeSidebar, openWidget, sidebarStore } from '../../../sidebar'

  export let widgets: Widget[] = []
  export let preferences: WidgetPreference[] = []
  export let selected: Ref<Widget> | undefined = undefined

  function handleAddWidget (): void {
    showPopup(AddWidgetsPopup, { widgets })
  }

  function handleSelectWidget (widget: Widget): void {
    if (selected === widget._id) {
      if ($deviceInfo.aside.float) $deviceInfo.aside.visible = false
      else minimizeSidebar(true)
    } else {
      openWidget(widget, $sidebarStore.widgetsState.get(widget._id)?.data, { active: true, openedByUser: true })
    }
  }

  $: fixedWidgets = widgets.filter((widget) => widget.type === WidgetType.Fixed)
  $: flexibleWidgets = widgets.filter(
    (widget) => widget.type === WidgetType.Flexible && $sidebarStore.widgetsState.has(widget._id)
  )
  $: configurableWidgets = preferences
    .filter((it) => it.enabled)
    .sort((a, b) => a.modifiedOn - b.modifiedOn)
    .map((it) => widgets.find((widget) => widget._id === it.attachedTo))
    .filter((widget): widget is Widget => widget !== undefined && widget.type === WidgetType.Configurable)
</script>

<div class="root">
  <div class="block">
    {#each fixedWidgets as widget}
      <WidgetPresenter
        {widget}
        highlighted={widget._id === selected}
        on:click={() => {
          handleSelectWidget(widget)
        }}
      />
    {/each}
    {#if configurableWidgets.length > 0}
      <div class="separator" />
      {#each configurableWidgets as widget}
        <WidgetPresenter
          {widget}
          highlighted={widget._id === selected}
          on:click={() => {
            handleSelectWidget(widget)
          }}
        />
      {/each}
    {/if}
    {#if flexibleWidgets.length > 0}
      <div class="separator" />
      {#each flexibleWidgets as widget}
        <WidgetPresenter
          {widget}
          highlighted={widget._id === selected}
          on:click={() => {
            handleSelectWidget(widget)
          }}
        />
      {/each}
    {/if}

    {#if widgets.some((widget) => widget.type === WidgetType.Configurable)}
      <div class="separator" />
      <ModernButton icon={IconSettings} size="small" on:click={handleAddWidget} />
    {/if}
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    padding-block: var(--spacing-2);
    height: 100%;
    width: 3.5rem;
    min-width: 3.5rem;
    max-width: 3.5rem;
    background-color: var(--theme-navpanel-color);
    border-radius: 0 var(--medium-BorderRadius) var(--medium-BorderRadius) 0;
    overflow-y: auto;
  }

  .block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .separator {
    width: 2rem;
    height: 1px;
    background-color: var(--global-ui-BorderColor);
  }
</style>
