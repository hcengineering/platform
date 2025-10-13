<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Doc, Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Method, Process, Transition, type Step } from '@hcengineering/process'
  import { clearSettingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, IconDelete, Label, Modal } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import StepEditor from './StepEditor.svelte'
  import ContextFooter from './ContextFooter.svelte'

  export let readonly: boolean
  export let process: Process
  export let step: Step<Doc>
  export let _id: Ref<Transition>

  const client = getClient()

  $: method = getMethod(step.methodId)

  function getMethod (_id: Ref<Method<Doc>>): Method<Doc> {
    if (method?._id !== _id) {
      const res = client.getModel().findAllSync(plugin.class.Method, { _id })[0]
      return res
    }
    return method
  }

  async function save (): Promise<void> {
    const doc = client.getModel().findObject(_id)
    if (doc === undefined) return
    const index = doc.actions.findIndex((it) => it._id === step._id)
    if (index === -1) return
    doc.actions[index] = step
    await client.update(doc, { actions: doc.actions })
    clearSettingsStore()
  }

  async function remove (): Promise<void> {
    const doc = client.getModel().findObject(_id)
    if (doc === undefined) return
    const index = doc.actions.findIndex((it) => it._id === step._id)
    if (index === -1) return
    doc.actions.splice(index, 1)
    await client.update(doc, { actions: doc.actions })
    clearSettingsStore()
  }

  function change (e: CustomEvent<Step<Doc>>): void {
    step = e.detail
  }
</script>

<Modal
  type={'type-aside'}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={true}
  showCancelButton={false}
  onCancel={clearSettingsStore}
>
  <svelte:fragment slot="actions">
    {#if !readonly}
      <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} on:click={remove} />
    {/if}
  </svelte:fragment>
  <div class="fs-title title text-xl" slot="title">
    <Label label={method.label} />
  </div>
  <StepEditor {step} {process} on:change={change} />
  <div slot="footer" class="flex-row-center flex-gap-2 w-full">
    <ContextFooter {process} {step} />
  </div>
</Modal>

<style lang="scss">
  .title {
    padding-left: 2rem;
  }
</style>
