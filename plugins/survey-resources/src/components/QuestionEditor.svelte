<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Button, Icon, IconCheck, IconEdit, IconUndo, Label } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Question } from '@hcengineering/survey'
  import { Class } from '@hcengineering/core'
  import survey from '../plugin'
  import { ComponentType } from 'svelte'
  import { getResource } from '@hcengineering/platform'
  import { questionUpdate } from '../functions/questionUpdate'

  export let index: number = 0
  export let object: Question

  type Data = (typeof object)['data']

  const client = getClient()
  let isEditing = false
  let isSubmitting = false
  let draftData: Data | null = null
  let dataClass: Class<Data>
  let dataEditorComponent: Promise<ComponentType>

  $: {
    const hierarchy = getClient().getHierarchy()
    dataClass = hierarchy.getClass<Data>(object.data._class)
    dataEditorComponent = getResource(hierarchy.as(dataClass, survey.mixin.QuestionDataEditor).editor)
  }

  export function startEditing (): void {
    draftData = structuredClone(object.data)
    isEditing = true
  }

  export async function commit (): Promise<void> {
    if (draftData !== null) {
      isSubmitting = true
      await questionUpdate(client, object, { data: draftData })
      isSubmitting = false
    }
    isEditing = false
  }

  export function rollback (): void {
    isEditing = false
    draftData = null
  }
</script>

<form class="root border-divider-color">
  <div
    class="flex flex-row-center flex-stretch flex-gap-1 background-comp-header-color bottom-divider pl-4 pr-2 pt-1 pb-1"
  >
    <div class="index">{index + 1}.</div>
    <div class="flex flex-row-center flex-gap-1 flex-grow">
      {#if dataClass.icon}
        <Icon icon={dataClass.icon} size="small" />
      {/if}
      <Label label={dataClass.label} />
    </div>
    <Button icon={IconEdit} disabled={isEditing} shape="circle" kind="ghost" on:click={startEditing} />
    <slot />
  </div>
  {#await dataEditorComponent then instance}
    <div class="root-editor pl-4 pt-4 pb-4 pr-2">
      {#if draftData !== null && isEditing}
        <svelte:component this={instance} bind:object={draftData} editable={isEditing} />
      {:else}
        <svelte:component this={instance} object={object.data} editable={false} />
      {/if}
    </div>

    {#if isEditing}
      <div class="flex flex-row-center justify-end flex-gap-1 pl-4 pr-4 pb-2 pt-2 top-divider">
        <Button kind="ghost" icon={IconUndo} on:click={rollback} disabled={isSubmitting}>
          <span slot="content">Cancel</span>
        </Button>
        <Button kind="primary" icon={IconCheck} on:click={commit} loading={isSubmitting}>
          <span slot="content">Save</span>
        </Button>
      </div>
    {/if}
  {/await}
</form>

<style lang="scss">
</style>
