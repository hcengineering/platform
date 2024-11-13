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
  import { createQuery } from '@hcengineering/presentation'
  import { Survey } from '@hcengineering/survey'
  import { Button, IconMoreH } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink, showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import EditSurvey from './EditSurvey.svelte'
  import survey from '../plugin'

  const dispatch = createEventDispatcher()
  const query = createQuery()

  export let _id: Ref<Survey>
  export let embedded: boolean = false
  export let readonly: boolean = false

  let object: Survey | undefined = undefined
  let editor: EditSurvey

  $: updateObject(_id)

  function updateObject (_id: Ref<Survey>): void {
    query.query(survey.class.Survey, { _id }, (result) => {
      object = result[0]
    })
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
      <DocNavLink noUnderline {object}>
        <div class="title">{object.name}</div>
      </DocNavLink>
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <Button
        icon={survey.icon.Poll}
        label={survey.string.SurveyPreview}
        on:click={() => {
          editor.previewSurveyForm()
        }}
      />
      {#if !readonly}
        <Button
          icon={IconMoreH}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          on:click={(e) => {
            showMenu(e, { object, excludedActions: [view.action.Open] })
          }}
        />
      {/if}
    </svelte:fragment>

    <div class="flex-col flex-grow flex-no-shrink">
      <EditSurvey bind:this={editor} {object} {readonly} showPeviewButton={false} />
    </div>
  </Panel>
{/if}
