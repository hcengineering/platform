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
  import { WithLookup } from '@hcengineering/core'
  import { translateCB } from '@hcengineering/platform'
  import { Component } from '@hcengineering/tracker'
  import { Icon, themeStore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import tracker from '../../plugin'

  export let value: WithLookup<Component> | undefined
  export let shouldShowAvatar = true
  export let onClick: (() => void) | undefined = undefined
  export let disabled: boolean = false
  export let inline: boolean = false
  export let accent: boolean = false
  export let noUnderline = false
  export let kind: 'list' | undefined = undefined

  let label: string

  $: if (value !== undefined) {
    label = value.label
  } else {
    translateCB(tracker.string.NoComponent, {}, $themeStore.language, (r) => {
      label = r
    })
  }
  $: disabled = disabled || value === undefined
</script>

<div class="flex-row-center">
  {#if inline}
    <ObjectMention object={value} {disabled} {noUnderline} {accent} {onClick} />
  {:else}
    <DocNavLink object={value} {onClick} {disabled} {noUnderline} {accent} component={view.component.EditDoc}>
      <span class="flex-presenter flex-row-center" class:list={kind === 'list'}>
        <div class="flex-row-center">
          {#if shouldShowAvatar}
            <div class="icon">
              <Icon icon={tracker.icon.Component} size={'small'} />
            </div>
          {/if}
          <span title={label} class="label nowrap" class:no-underline={disabled || noUnderline} class:fs-bold={accent}>
            {label}
          </span>
        </div>
      </span>
    </DocNavLink>
  {/if}
</div>
