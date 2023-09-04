<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import { Vacancy } from '@hcengineering/recruit'
  import { Icon, getPlatformAvatarColorForTextDef, themeStore, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import recruit from '../plugin'

  export let value: Vacancy
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false

  const dispatch = createEventDispatcher()
  $: accentColor = getPlatformAvatarColorForTextDef(value.name, $themeStore.dark)

  $: dispatch('accent-color', accentColor)
  onMount(() => {
    dispatch('accent-color', accentColor)
  })
</script>

{#if value}
  <DocNavLink
    {disabled}
    object={value}
    {inline}
    {accent}
    noUnderline={disabled}
    component={recruit.component.EditVacancy}
  >
    <div class="flex-presenter" class:inline-presenter={inline} use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
      {#if !inline}
        <div class="icon"><Icon icon={recruit.icon.Vacancy} size={'small'} /></div>
      {/if}
      <span class="label nowrap" class:no-underline={disabled} class:fs-bold={accent}>{value.name}</span>
    </div>
  </DocNavLink>
{/if}
