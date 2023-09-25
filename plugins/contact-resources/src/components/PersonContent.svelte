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
  import { Employee, getName, Person } from '@hcengineering/contact'
  import { IntlString } from '@hcengineering/platform'
  import {
    getPlatformAvatarColorDef,
    getPlatformAvatarColorForTextDef,
    IconSize,
    Label,
    LabelAndProps,
    themeStore,
    tooltip
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import Avatar from './Avatar.svelte'
  import { getClient } from '@hcengineering/presentation'
  import PersonElement from './PersonElement.svelte'

  export let value: Person | Employee | undefined | null
  export let inline: boolean = false
  export let disabled = false
  export let shouldShowAvatar: boolean = true
  export let shouldShowName = true
  export let element: HTMLElement | undefined = undefined
  export let shouldShowPlaceholder = false
  export let noUnderline: boolean = false
  export let defaultName: IntlString | undefined = undefined
  export let statusLabel: IntlString | undefined = undefined
  export let avatarSize: IconSize = 'x-small'
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined
  export let enlargedText = false
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let maxWidth = ''

  const client = getClient()

  const onEditClick = (evt: MouseEvent) => {
    if (!disabled) {
      onEdit?.(evt)
    }
  }
  const dispatch = createEventDispatcher()

  $: name = value ? getName(client.getHierarchy(), value) : ''
  $: accentColor =
    value?.name !== undefined
      ? getPlatformAvatarColorForTextDef(value?.name ?? '', $themeStore.dark)
      : getPlatformAvatarColorDef(0, $themeStore.dark)

  $: dispatch('accent-color', accentColor)

  onMount(() => {
    dispatch('accent-color', accentColor)
  })
</script>

{#if value}
  {#if statusLabel}
    <div class="inline-flex items-center clear-mins">
      <PersonElement
        {value}
        {name}
        {inline}
        {disabled}
        {shouldShowAvatar}
        {shouldShowName}
        {noUnderline}
        {avatarSize}
        {onEdit}
        {showTooltip}
        {enlargedText}
        {colorInherit}
        {accent}
        {maxWidth}
      />
      <span class="status">
        <Label label={statusLabel} />
      </span>
    </div>
  {:else}
    <PersonElement
      {value}
      {name}
      {inline}
      {disabled}
      {shouldShowAvatar}
      {shouldShowName}
      {noUnderline}
      {avatarSize}
      {onEdit}
      {showTooltip}
      {enlargedText}
      {colorInherit}
      {accent}
      {maxWidth}
    />
  {/if}
{:else if shouldShowPlaceholder}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    class="antiPresenter"
    class:text-base={enlargedText}
    use:tooltip={disabled ? undefined : showTooltip}
    on:click={onEditClick}
  >
    {#if !inline && shouldShowAvatar}
      <span class="ap-icon" class:mr-2={shouldShowName && !enlargedText} class:mr-3={shouldShowName && enlargedText}>
        <Avatar size={avatarSize} on:accent-color />
      </span>
    {/if}
    {#if shouldShowName && defaultName}
      <span class="ap-label" class:colorInherit class:fs-bold={accent}>
        <Label label={defaultName} />
      </span>
    {/if}
  </span>
{/if}

<style lang="scss">
  .status {
    margin-left: 0.25rem;
    padding: 0 0.25rem;
    white-space: nowrap;
    font-size: 0.75rem;
    color: var(--theme-content-color);
    background-color: var(--theme-button-default);
    border-radius: 0.25rem;
  }
</style>
