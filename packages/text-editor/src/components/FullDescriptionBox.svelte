<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { IntlString, Asset } from '@anticrm/platform'
  import { Label, IconEdit, Button, Icon, IconCheck, IconClose } from '@anticrm/ui'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import StyledTextBox from './StyledTextBox.svelte'
  import textEditorPlugin from '../plugin'
  import IconDescription from './icons/Description.svelte'

  export let label: IntlString = textEditorPlugin.string.FullDescription
  export let icon: Asset | AnySvelteComponent = IconDescription
  export let content: string = ''
  export let emptyMessage: IntlString = textEditorPlugin.string.NoFullDescription

  const dispatch = createEventDispatcher()

  let fullDescription: StyledTextBox
  let editMode: boolean = false
</script>

<div class="antiSection">
  <div class="antiSection-header mb-2">
    <div class="antiSection-header__icon">
      <Icon {icon} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label {label} />
    </span>
    <div class="buttons-group xsmall-gap">
      {#if editMode}
        <Button
          icon={IconClose}
          kind={'transparent'}
          shape={'circle'}
          on:click={() => {
            fullDescription.cancelEdit()
            editMode = false
          }}
        />
        <Button
          icon={IconCheck}
          kind={'transparent'}
          shape={'circle'}
          on:click={() => {
            fullDescription.saveEdit()
            editMode = false
          }}
        />
      {:else}
        <Button
          icon={IconEdit}
          kind={'transparent'}
          shape={'circle'}
          on:click={() => {
            fullDescription.startEdit()
            editMode = true
          }}
        />
      {/if}
    </div>
  </div>
  {#if !editMode && (content === '' || content === '<p></p>')}
    <div class="antiSection-empty solid">
      <Label label={emptyMessage} />
    </div>
  {:else}
    <div class="antiSection-body">
      <StyledTextBox
        bind:this={fullDescription}
        {content}
        mode={editMode ? 2 : 1}
        hideExtraButtons
        maxHeight={'50vh'}
        on:value={(evt) => {
          dispatch('change', evt.detail)
        }}
      />
    </div>
  {/if}
</div>
