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
  import type { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { Survey } from '@hcengineering/survey'
  import { Button, IconAdd, Label, Section, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import SurveyForm from './SurveyForm.svelte'
  import SurveyPopup from './SurveyPopup.svelte'
  import survey from '../plugin'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let readonly: boolean = false
  export let polls: number

  let loading = true
  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined

  function createPoll (ev: MouseEvent): void {
    showPopup(SurveyPopup, {}, ev.target as HTMLElement, (result) => {
      if (result != null) {
        showPopup(SurveyForm, { source: result as Survey, objectId, space, _class }, 'top')
      }
    })
  }
</script>

<Section label={survey.string.Polls} icon={survey.icon.Poll}>
  <svelte:fragment slot="header">
    <div class="buttons-group xsmall-gap">
      <ViewletSelector
        hidden
        bind:viewlet
        bind:preference
        bind:loading
        viewletQuery={{ _id: survey.viewlet.TablePoll }}
      />
      <ViewletSettingButton kind={'tertiary'} bind:viewlet />
      {#if !readonly}
        <Button id={survey.string.CreatePoll} icon={IconAdd} kind={'ghost'} on:click={createPoll} />
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if polls > 0 && viewlet}
      <Table
        _class={survey.class.Poll}
        config={preference?.config ?? viewlet.config}
        options={viewlet.options}
        query={{ attachedTo: objectId }}
        loadingProps={{ length: polls }}
        {readonly}
      />
    {:else}
      <div class="antiSection-empty solid flex-col mt-3">
        <span class="content-dark-color">
          <Label label={survey.string.NoPollsForDocument} />
        </span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if !readonly}
          <span class="over-underline content-color" on:click={createPoll}>
            <Label label={survey.string.CreatePoll} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Section>
