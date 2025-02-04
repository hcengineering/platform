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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { AccountRole, Doc, getCurrentAccount } from '@hcengineering/core'
  import { Card, isAdminUser } from '@hcengineering/presentation'
  import ui, { Button, Label } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import { personRefByPersonIdStore } from '../utils'
  import { PersonRefPresenter } from '..'

  export let object: Doc | Doc[]
  export let deleteAction: () => void | Promise<void>
  export let skipCheck: boolean = false
  export let canDeleteExtra: boolean = true
  const me = getCurrentEmployee()
  const objectArray = Array.isArray(object) ? object : [object]
  const dispatch = createEventDispatcher()
  $: creators = [...new Set(objectArray.map((obj) => obj.createdBy))]
    .map((pid) => (pid !== undefined ? $personRefByPersonIdStore.get(pid) : undefined))
    .filter((p) => p !== undefined)
  $: canDelete =
    (skipCheck ||
      (creators.length === 1 && creators[0] === me) ||
      getCurrentAccount().role === AccountRole.Owner ||
      isAdminUser()) &&
    canDeleteExtra
  $: label = canDelete ? view.string.DeleteObject : view.string.DeletePopupNoPermissionTitle
</script>

<Card
  {label}
  okAction={deleteAction}
  canSave={canDelete}
  okLabel={canDelete ? view.string.LabelYes : ui.string.Ok}
  on:close={() => dispatch('close')}
>
  <svelte:fragment slot="buttons">
    {#if canDelete}
      <Button label={view.string.LabelNo} on:click={() => dispatch('close')} />
    {/if}
  </svelte:fragment>
  <div class="flex-grow flex-col">
    {#if canDelete}
      <div class="mb-2">
        <Label label={view.string.DeleteObjectConfirm} params={{ count: objectArray.length }} />
        <div class="mt-2">
          {#if objectArray.length === 1}
            <ObjectPresenter _class={objectArray[0]._class} objectId={objectArray[0]._id} value={objectArray[0]} />
          {/if}
        </div>
      </div>
    {:else}
      <div class="mb-2">
        <Label label={view.string.DeletePopupNoPermissionLabel} />
      </div>
      <div class="mb-2">
        <Label label={view.string.DeletePopupCreatorLabel} />
        {#each creators as person}
          <div class="my-2">
            <PersonRefPresenter value={person} />
          </div>
        {/each}
      </div>
      <!-- Fix if really needed? -->
      <!-- <div class="mb-2">
        <Label label={view.string.DeletePopupOwnerLabel} />
        {#each owners as owner}
          <div class="my-2">
            <PersonPresenter value={owner} />
          </div>
        {/each}
      </div> -->
    {/if}
  </div>
  <slot />
</Card>
