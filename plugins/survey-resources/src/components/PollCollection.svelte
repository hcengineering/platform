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
  import { getClient } from '@hcengineering/presentation'
  import { Survey } from '@hcengineering/survey'
  import { Button, IconAdd, Label, Section, navigate, showPopup } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletSelector, ViewletSettingButton, getObjectLinkFragment } from '@hcengineering/view-resources'
  import SurveyPopup from './SurveyPopup.svelte'
  import survey from '../plugin'
  import { makePollData } from '../utils'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>
  export let readonly: boolean = false
  export let polls: number

  let loading = true
  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined

  function selectSurvey (ev: MouseEvent): void {
    showPopup(SurveyPopup, {}, ev.target as HTMLElement, async (result) => {
      if (result != null) {
        await createPoll(result as Survey)
      }
    })
  }

  async function createPoll (source: Survey): Promise<void> {
    const client = getClient()
    const pollId = await client.addCollection(survey.class.Poll, space, objectId, _class, 'polls', makePollData(source))

    const poll = await client.findOne(survey.class.Survey, { _id: pollId })
    if (poll === undefined) {
      console.error(`Could not find just created poll ${pollId}.`)
      return
    }

    const hierarchy = client.getHierarchy()
    const panel = hierarchy.classHierarchyMixin(poll._class as Ref<Class<Doc>>, view.mixin.ObjectPanel)
    const loc = await getObjectLinkFragment(hierarchy, poll, {}, panel?.component)
    navigate(loc)
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
        <Button id={survey.string.CreatePoll} icon={IconAdd} kind={'ghost'} on:click={selectSurvey} />
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
          <span class="over-underline content-color" on:click={selectSurvey}>
            <Label label={survey.string.CreatePoll} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Section>
