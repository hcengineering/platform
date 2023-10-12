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
  import { Component } from '@hcengineering/tracker'
  import { Icon, tooltip, themeStore } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import view from '@hcengineering/view'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { translate } from '@hcengineering/platform'

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
    translate(tracker.string.NoComponent, {}, $themeStore.language)
      .then((r) => {
        label = r
      })
      .catch((err) => {
        console.error(err)
      })
  }
  $: disabled = disabled || value === undefined
</script>

<DocNavLink object={value} {onClick} {disabled} {noUnderline} {inline} {accent} component={view.component.EditDoc}>
  {#if inline}
    <span class="antiMention" use:tooltip={{ label: tracker.string.Component }}>@{label}</span>
  {:else}
    <span class="flex-presenter" class:list={kind === 'list'} use:tooltip={{ label: tracker.string.Component }}>
      {#if shouldShowAvatar}
        <div class="icon">
          <Icon icon={tracker.icon.Component} size={'small'} />
        </div>
      {/if}
      <span title={label} class="label nowrap" class:no-underline={disabled || noUnderline} class:fs-bold={accent}>
        {label}
      </span>
    </span>
  {/if}
</DocNavLink>
