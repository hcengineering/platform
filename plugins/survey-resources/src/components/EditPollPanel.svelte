<!--
//
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
//
-->
<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import { Poll } from '@hcengineering/survey'
  import { Button, IconMoreH, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink, ParentsNavigator, showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import EditPoll from './EditPoll.svelte'
  import survey from '../plugin'

  const dispatch = createEventDispatcher()
  const query = createQuery()

  export let _id: Ref<Poll>
  export let embedded: boolean = false
  export let readonly: boolean = false

  let object: Poll | undefined = undefined
  let canSubmit = false
  let requestUpdate = false

  $: isCompleted = object?.isCompleted ?? false
  $: editable = (!readonly && !isCompleted) || requestUpdate

  $: updateObject(_id)

  function updateObject (_id: Ref<Poll>): void {
    query.query(survey.class.Poll, { _id }, (result) => {
      object = result[0]
    })
  }

  async function submit (): Promise<void> {
    if (object === undefined) {
      return
    }
    requestUpdate = false
    // showPopup(
    //   MessageBox,
    //   {
    //     label: survey.string.SurveySubmit,
    //     message: survey.string.SurveySubmitConfirm
    //   },
    //   undefined,
    //   async (result?: boolean) => {
    //     if (result === true && object !== undefined) {
    //       await getClient().updateDoc(object._class, object.space, object._id, { isCompleted: true })
    //     }
    //   }
    // )
    await getClient().updateDoc(object._class, object.space, object._id, { isCompleted: true })
  }
</script>

{#if object}
  <Panel
    isHeader={false}
    isSub={false}
    isAside={true}
    {embedded}
    {object}
    on:open
    on:close={() => {
      dispatch('close')
    }}
    withoutInput={readonly}
  >
    <svelte:fragment slot="title">
      {#if !embedded}<ParentsNavigator element={object} />{/if}
      <DocNavLink noUnderline {object}>
        <div class="title">{object.name}</div>
      </DocNavLink>
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if editable}
        <Button
          icon={survey.icon.Submit}
          label={survey.string.SurveySubmit}
          kind={'primary'}
          disabled={!canSubmit}
          showTooltip={{ label: canSubmit ? undefined : survey.string.ValidateFail }}
          on:click={submit}
        />
      {:else}
        <Button
          icon={view.icon.Edit}
          label={survey.string.EditAnswers}
          on:click={() => {
            requestUpdate = true
          }}
        />
      {/if}
      <Button
        icon={IconMoreH}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        on:click={(e) => {
          showMenu(e, { object, excludedActions: [view.action.Open] })
        }}
      />
    </svelte:fragment>

    <div class="flex-col flex-grow flex-no-shrink">
      <EditPoll {object} readonly={!editable} bind:canSubmit />
    </div>
  </Panel>
{/if}
