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
  import { ObjectPresenterType } from '@hcengineering/view'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'

  import recruit from '../plugin'

  export let value: Vacancy
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let type: ObjectPresenterType = 'link'

  const dispatch = createEventDispatcher()
  $: accentColor = getPlatformAvatarColorForTextDef(value?.name ?? '', $themeStore.dark)

  $: dispatch('accent-color', accentColor)
  onMount(() => {
    dispatch('accent-color', accentColor)
  })
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} component={recruit.component.EditVacancy} />
  {:else if type === 'link'}
    <div class="flex-between flex-gap-2 w-full">
      <DocNavLink {disabled} object={value} {accent} {noUnderline} component={recruit.component.EditVacancy}>
        <div class="flex-presenter" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
          <div class="icon"><Icon icon={recruit.icon.Vacancy} size={'small'} /></div>
          <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
            {value.name}
          </span>
        </div>
      </DocNavLink>
    </div>
  {:else if type === 'text'}
    <span class="overflow-label" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
      {value.name}
    </span>
  {/if}
{/if}
