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
  import { Action, Menu, ModernTab, showPopup } from '@hcengineering/ui'
  import { Widget, WidgetTab } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'

  export let tab: WidgetTab
  export let widget: Widget
  export let selected = false
  export let actions: Action[] = []

  $: icon = tab.icon ?? widget.icon

  $: if (tab.iconComponent) {
    void getResource(tab.iconComponent).then((res) => {
      icon = res
    })
  }

  function handleMenu (event: MouseEvent): void {
    if (actions.length === 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    showPopup(Menu, { actions }, event.target as HTMLElement)
  }
</script>

<ModernTab
  label={tab.name}
  labelIntl={tab.nameIntl ?? widget.label}
  highlighted={selected}
  orientation="vertical"
  kind={tab.isPinned ? 'secondary' : 'primary'}
  {icon}
  iconProps={tab.iconProps}
  canClose={!tab.isPinned}
  maxSize="13.5rem"
  on:close
  on:click
  on:contextmenu={handleMenu}
/>
