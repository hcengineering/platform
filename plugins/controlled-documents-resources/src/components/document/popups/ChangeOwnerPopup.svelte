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
  import documents, { Document } from '@hcengineering/controlled-documents'
  import { Employee } from '@hcengineering/contact'
  import { EmployeeBox, EmployeePresenter, personRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import core, { Ref, Space, notEmpty } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Icon, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  import { canChangeDocumentOwner, isDocOwner } from '../../../utils'
  import Info from '../../icons/Info.svelte'
  import DocumentVersionPresenter from '../presenters/DocumentVersionPresenter.svelte'
  import StatePresenter from '../presenters/StatePresenter.svelte'

  export let object: Document

  let space: Space | undefined
  let owner: Ref<Employee> | undefined = undefined
  let canChange = false

  const client = getClient()
  const query = createQuery()
  const dispatch = createEventDispatcher()

  const handleChangeOwner = async () => {
    if (!canChange || !owner || !object || owner === object.owner) {
      return
    }

    await client.update(object, { owner })
    dispatch('close')
  }

  $: query.query(core.class.Space, { _id: object.space }, (res) => {
    ;[space] = res
  })

  $: if (object) {
    void canChangeDocumentOwner(object).then((value) => {
      canChange = value
    })
  }

  $: isOwner = isDocOwner(object)

  $: members = space?.members ?? []
  $: employees = members.map((m) => $personRefByAccountUuidStore.get(m) as Ref<Employee>).filter(notEmpty)

  $: docQuery = space?.private ?? false ? { active: true, _id: { $in: employees } } : { active: true }
</script>

{#if object}
  <div class="text-editor-popup min-w-112">
    <div class="p-6 bottom-divider">
      <div class="text-base font-medium primary-text-color pb-2">
        <Label label={documents.string.ChangeOwner} />
      </div>
      <div class="flex flex-gap-1 hint text-sm">
        <Label label={documents.string.ChangeOwnerHintBeginning} />
        <div class="flex flex-gap-1 primary-text-color fs-bold">
          <span>{object.title}</span>
          <div><DocumentVersionPresenter value={object} /></div>
          <div>[<StatePresenter value={object} showTag={false} />]</div>
        </div>
        <Label label={documents.string.ChangeOwnerHintEnd} />
      </div>
      <div class="flex flex-gap-4 items-center pt-6">
        {#if !isOwner}
          <div class="fs-bold primary-text-color">
            <EmployeePresenter value={object.owner} avatarSize="card" noUnderline disabled colorInherit />
          </div>
          <Icon icon={view.icon.ArrowRight} size="medium" fill="var(--theme-progress-color)" />
        {/if}
        <EmployeeBox
          bind:value={owner}
          {docQuery}
          label={documents.string.SelectOwner}
          readonly={!canChange}
          showNavigate={false}
          allowDeselect={false}
        />
      </div>
    </div>

    <div class="flex items-center flex-between pr-6 pl-6 pt-4 pb-4">
      <div class="flex flex-gap-2 items-center max-w-60 p-1 text-xs pr-4">
        {#if isOwner}
          <div class="warning-sign">
            <Info size="small" />
          </div>
          <Label label={documents.string.ChangeOwnerWarning} />
        {/if}
      </div>
      <div class="flex justify-end items-center flex-gap-2">
        <Button kind="regular" label={presentation.string.Cancel} on:click={() => dispatch('close')} />
        <Button
          kind={!isOwner ? 'primary' : 'dangerous'}
          disabled={!canChange || !owner || owner === object.owner}
          label={presentation.string.Change}
          on:click={handleChangeOwner}
        />
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .hint {
    color: var(--theme-dark-color);
  }

  .warning-sign {
    color: var(--theme-docs-warning-icon-color);
  }

  .primary-text-color {
    color: var(--theme-text-primary-color);
  }
</style>
