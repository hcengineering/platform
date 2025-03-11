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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Survey } from '@hcengineering/survey'
  import {
    Breadcrumb,
    Button,
    DebouncedCaller,
    Icon,
    IconMoreH,
    Label,
    ThrottledCaller,
    tooltip
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import survey from '../plugin'
  import { makePollData } from '../utils'
  import EditPoll from './EditPoll.svelte'
  import EditSurvey from './EditSurvey.svelte'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const query = createQuery()

  const throttle = new ThrottledCaller(250)
  const debounce = new DebouncedCaller(1000)

  export let _id: Ref<Survey>
  export let embedded: boolean = false
  export let readonly: boolean = false

  interface Patch {
    id: number
    patch: Partial<Survey>
  }

  function combinedPatch (patches: Patch[]): Partial<Survey> {
    return patches.reduce((r, c) => Object.assign(r, c.patch), {})
  }

  let patchCounter = 0
  let patches: Patch[] = []

  let objectState: Survey | undefined = undefined
  $: object = objectState ? { ...objectState, ...combinedPatch(patches) } : undefined

  let preview = false
  let canSubmit = false

  $: void queryObject(_id)
  $: poll = preview && object !== undefined ? makePollData(object) : undefined

  async function queryObject (_id: Ref<Survey>): Promise<void> {
    await flush()
    objectState = undefined
    patches = []
    query.query(survey.class.Survey, { _id }, (result) => {
      objectState = result[0]
    })
  }

  function handleChange (patch: Partial<Survey>): void {
    patches = [...patches, { id: patchCounter++, patch }]
    throttle.call(() => {
      void flush()
    })
  }

  async function flush (): Promise<void> {
    if (!object?._id || patches.length < 1) return

    const patchesToApply = patches.slice()
    const patchIds = new Set(patchesToApply.map((p) => p.id))
    const update: Partial<Survey> = combinedPatch(patchesToApply)

    await client.updateDoc(object._class, object.space, object._id, update)
    debounce.call(() => {
      patches = patches.filter((p) => !patchIds.has(p.id))
    })
  }
  onDestroy(flush)
</script>

<svelte:window on:beforeunload={flush} />
{#if object}
  <Panel
    isHeader={false}
    isSub={false}
    isAside={false}
    {embedded}
    {object}
    on:open
    on:close={() => {
      dispatch('close')
    }}
    withoutInput={readonly}
  >
    <svelte:fragment slot="title">
      <Breadcrumb icon={survey.icon.Survey} title={object.name} size={'large'} isCurrent />
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#if !readonly}
        {#if preview}
          {#if canSubmit}
            <div use:tooltip={{ label: survey.string.ValidateOk }}>
              <Icon size="x-large" icon={survey.icon.ValidateOk} fill="var(--positive-button-default)" />
            </div>
          {:else}
            <div use:tooltip={{ label: survey.string.ValidateFail }}>
              <Icon size="x-large" icon={survey.icon.ValidateFail} fill="var(--theme-trans-color)" />
            </div>
          {/if}
        {/if}
        <Button
          icon={preview ? survey.icon.Survey : survey.icon.Poll}
          label={preview ? survey.string.SurveyEdit : survey.string.SurveyPreview}
          on:click={() => {
            preview = !preview
          }}
        />
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
      {#if preview}
        {#if poll !== undefined}
          <div class="antiSection-empty solid mb-8">
            <Icon icon={survey.icon.Info} size={'large'} />
            <span class="content-dark-color text-balance" style="margin-left:1em">
              <Label label={survey.string.ValidateInfo} />
            </span>
          </div>
          <EditPoll object={poll} bind:canSubmit />
        {/if}
      {:else}
        <EditSurvey
          {object}
          on:change={(e) => {
            handleChange(e.detail)
          }}
          {readonly}
        />
      {/if}
    </div>
  </Panel>
{/if}
