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
  import { Button, Icon, Label, Loading } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Question } from '@hcengineering/survey'
  import { Class } from '@hcengineering/core'
  import survey from '../plugin'
  import { ComponentType } from 'svelte'
  import { getResource } from '@hcengineering/platform'
  import { questionUpdate } from '../functions/questionUpdate'
  import { deepEqual } from 'fast-equals'

  export let index: number = 0
  export let object: Question

  type Data = (typeof object)['data']

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let dataClass: Class<Data>
  let dataEditorComponent: Promise<ComponentType>
  $: if (object.data._class !== dataClass?._id) {
    dataClass = hierarchy.getClass<Data>(object.data._class)
    dataEditorComponent = getResource(hierarchy.as(dataClass, survey.mixin.QuestionDataEditor).editor)
  }

  let data: Data = object.data
  $: if (!deepEqual(data, object.data)) {
    data = object.data
  }

  let isPreviewing = false
  let isSubmitting = false

  async function submit (data: Data): Promise<void> {
    isSubmitting = true
    await questionUpdate(client, object, { data })
    isSubmitting = false
  }
</script>

<div class="root border-divider-color">
  <div
    class="flex flex-row-center flex-stretch flex-gap-1 background-comp-header-color bottom-divider pl-4 pr-4 pt-1 pb-1"
  >
    <div class="index">{index + 1}.</div>
    <div class="flex flex-row-center flex-gap-1 flex-grow">
      {#if isSubmitting}
        <Loading size="inline" shrink />
      {:else if dataClass.icon}
        <Icon icon={dataClass.icon} size="small" />
      {/if}
      <Label label={dataClass.label} />
    </div>
    <Button
      icon={survey.icon.Eye}
      shape="circle"
      kind={isPreviewing ? 'primary' : 'ghost'}
      on:click={() => {
        isPreviewing = !isPreviewing
      }}
    />
    <slot />
  </div>
  {#await dataEditorComponent then instance}
    <div class="root-editor pl-4 pt-4 pb-4 pr-4">
      <svelte:component this={instance} editable={!isPreviewing} object={data} {submit} />
    </div>
  {/await}
</div>

<style lang="scss">
</style>
