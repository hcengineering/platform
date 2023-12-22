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
  import { Button, EditBox, Icon, Label, Loading } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Question } from '@hcengineering/survey'
  import { Class } from '@hcengineering/core'
  import survey from '../plugin'
  import { ComponentType } from 'svelte'
  import { getResource } from '@hcengineering/platform'
  import { questionUpdate } from '../functions/questionUpdate'
  import { deepEqual } from 'fast-equals'

  // TODO: Move to `generics` attribute when IDE supports it
  //  https://youtrack.jetbrains.com/issue/WEB-57377
  type Q = Question

  export let index: number = 0
  export let object: Q

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let questionClass: Class<Q>
  let questionEditorComponent: Promise<ComponentType>
  $: if (object._class !== questionClass?._id) {
    questionClass = hierarchy.getClass<Q>(object._class)
    questionEditorComponent = getResource(hierarchy.as(questionClass, survey.mixin.QuestionEditor).editor)
  }

  // A copy of current object to be passed to nested editor
  let draft: Q = object
  $: {
    const externalChangesDetected = !deepEqual(object, draft)
    if (externalChangesDetected) {
      draft = object
    }
  }

  let isPreviewing = false
  let isSubmitting = false

  async function submit (data: Partial<Q>): Promise<void> {
    isSubmitting = true
    await questionUpdate(client, object, data)
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
      {:else if questionClass.icon}
        <Icon icon={questionClass.icon} size="small" />
      {/if}
      <Label label={questionClass.label} />
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
  <form class="root-editor pl-4 pt-4 pb-4 pr-4">
    <div class="mb-4 clear-mins">
      <EditBox
        bind:value={draft.title}
        on:change={() => {
          void submit({ title: draft.title })
        }}
        kind="large-style"
        autoFocus
        fullSize
        disabled={isPreviewing}
      />
    </div>
    {#await questionEditorComponent}
      <Loading />
    {:then instance}
      <svelte:component this={instance} editable={!isPreviewing} object={draft} {submit} />
    {/await}
  </form>
</div>

<style lang="scss">
</style>
