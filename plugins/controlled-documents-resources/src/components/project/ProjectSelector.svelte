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
  import { Ref, Space } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, ButtonKind, ButtonSize, Label, showPopup } from '@hcengineering/ui'
  import { Project } from '@hcengineering/controlled-documents'
  import { createEventDispatcher } from 'svelte'

  import ProjectSelectorPopup from './ProjectSelectorPopup.svelte'

  import documents from '../../plugin'

  export let value: Ref<Project> | undefined
  export let space: Ref<Space>
  export let disabled: boolean = false
  export let pressed: boolean = false
  export let focusIndex = -1
  export let maxWidth = ''
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let justify: 'left' | 'center' = 'center'
  export let showDropdownIcon: boolean = false
  export let showReadonly: boolean = true

  const dispatch = createEventDispatcher()

  let container: HTMLElement

  let project: Project | undefined
  const query = createQuery()
  $: query.query(documents.class.Project, { _id: value }, (res) => {
    ;[project] = res
  })

  function showVersionsPopup (): void {
    if (disabled) return

    pressed = true
    showPopup(ProjectSelectorPopup, { space, showReadonly, selected: value }, container, (result) => {
      if (result !== undefined) {
        value = result
        dispatch('change', result)
      }
      pressed = false
    })
  }

  $: padding = showDropdownIcon ? '0 .25rem 0 .5rem' : '0 .5rem'
</script>

<div bind:this={container} class="min-w-0" style:max-width={maxWidth}>
  <Button
    {focusIndex}
    width="100%"
    {padding}
    {kind}
    {size}
    {justify}
    {disabled}
    stopPropagation
    on:click={showVersionsPopup}
    showTooltip={{
      label: project !== undefined ? getEmbeddedLabel(project.name) : documents.string.Project
    }}
  >
    <span slot="content" class="overflow-label disabled text">
      {#if project}{project.name}{:else}<Label label={documents.string.Project} />{/if}
    </span>

    <svelte:fragment slot="iconRight">
      {#if showDropdownIcon}
        <div class="w-4 h-4 ml-1 flex-no-shrink">
          <svg fill="var(--theme-dark-color)" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 6.625L8 10.375L5 6.625L11 6.625Z" />
          </svg>
        </div>
      {/if}
    </svelte:fragment>
  </Button>
</div>
