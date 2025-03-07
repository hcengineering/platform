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
  import { Card, Tag } from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import {
    Button,
    Chevron,
    ExpandCollapse,
    getColorNumberByText,
    getCurrentResolvedLocation,
    getPlatformColorDef,
    IconAdd,
    Label,
    navigate,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import CardAttributes from './CardAttributes.svelte'

  export let value: Card
  export let tag: Tag
  export let readonly: boolean = false
  export let ignoreKeys: string[]

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const label = hierarchy.getClass(tag._id).label

  let isCollapsed = false

  export function collapse (): void {
    isCollapsed = true
  }

  export function expand (): void {
    isCollapsed = false
  }

  $: color = getPlatformColorDef(getColorNumberByText(tag.label), $themeStore.dark).color
</script>

<div class="header flex flex-gap-2">
  <div
    class="label flex flex-gap-2"
    style="background: {color + '33'}; border-color: {color}"
    on:click={isCollapsed ? expand : collapse}
  >
    <Label {label} />
    <Chevron expanded={!isCollapsed} outline fill={'var(--content-color'} />
  </div>
  <div class="btns">
    <Button
      icon={IconAdd}
      kind={'link'}
      size={'medium'}
      showTooltip={{ label: setting.string.AddAttribute }}
      on:click={(ev) => {
        showPopup(setting.component.CreateAttributePopup, { _class: tag._id }, 'top')
      }}
    />
    <Button
      icon={setting.icon.Setting}
      kind={'link'}
      size={'medium'}
      showTooltip={{ label: setting.string.Setting }}
      on:click={(ev) => {
        ev.stopPropagation()
        const loc = getCurrentResolvedLocation()
        loc.path[2] = settingId
        loc.path[3] = 'masterTags'
        loc.path[4] = tag._id
        loc.path.length = 5
        loc.fragment = undefined
        navigate(loc)
      }}
    />
  </div>
</div>
<ExpandCollapse isExpanded={!isCollapsed}>
  <CardAttributes object={value} _class={tag._id} to={tag.extends} {readonly} {ignoreKeys} />
</ExpandCollapse>

<style lang="scss">
  .label {
    cursor: pointer;
    padding: 0.25rem 1rem;
    width: fit-content;
    font-size: 1.25rem;
    align-items: center;
    font-weight: 500;
    border: 1px solid;
    border-radius: 6rem;
    color: var(--theme-caption-color);
  }

  .header {
    width: fit-content;
    align-items: center;
    margin-top: 0.5rem;
    margin-bottom: 1rem;

    &:hover {
      .btns {
        visibility: visible;
      }
    }

    .btns {
      display: flex;
      align-items: center;
      visibility: hidden;
    }
  }
</style>
