<!--
// Copyright © 2023 Anticrm Platform Contributors.
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
  import contact from '@hcengineering/contact'
  import ExpandRightDouble from '@hcengineering/contact-resources/src/components/icons/ExpandRightDouble.svelte'
  import { FindOptions } from '@hcengineering/core'
  import { OK, Severity, Status } from '@hcengineering/platform'
  import presentation, { Card, SpaceSelect, createQuery, getClient } from '@hcengineering/presentation'
  import type { Applicant, Vacancy } from '@hcengineering/recruit'
  import { State, getStates } from '@hcengineering/task'
  import ui, {
    Button,
    ColorPopup,
    FocusHandler,
    Label,
    ListView,
    Status as StatusControl,
    createFocusManager,
    defaultBackground,
    deviceOptionsStore as deviceInfo,
    getColorNumberByText,
    getPlatformColorDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { moveToSpace } from '@hcengineering/view-resources/src/utils'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import ApplicationPresenter from './ApplicationPresenter.svelte'
  import VacancyCard from './VacancyCard.svelte'
  import VacancyOrgPresenter from './VacancyOrgPresenter.svelte'

  export let selected: Applicant[]

  const status: Status = OK

  let _space = selected[0]?.space

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return true
  }
  let loading = false

  async function updateApplication () {
    loading = true
    if (selectedState === undefined) {
      throw new Error(`Please select initial state:${_space}`)
    }
    if (selectedState === undefined) {
      throw new Error(`create application: state not found space:${_space}`)
    }

    const op = client.apply('application.states')

    for (const a of selected) {
      await moveToSpace(op, a, _space, { status: selectedState._id, doneState: null })
    }
    await op.commit()
    loading = false
    dispatch('close')
  }

  let states: Array<{ id: number | string; color: number; label: string }> = []
  let selectedState: State | undefined
  let rawStates: State[] = []
  const spaceQuery = createQuery()

  let vacancy: Vacancy | undefined

  $: if (_space) {
    spaceQuery.query(recruit.class.Vacancy, { _id: _space }, (res) => {
      vacancy = res.shift()
    })
  }

  $: rawStates = getStates(vacancy, $statusStore)

  $: if (rawStates.findIndex((it) => it._id === selectedState?._id) === -1) {
    selectedState = rawStates[0]
  }

  $: states = rawStates.map((s) => {
    return { id: s._id, label: s.name, color: s.color ?? getColorNumberByText(s.name) }
  })

  const manager = createFocusManager()

  const orgOptions: FindOptions<Vacancy> = {
    lookup: {
      company: contact.class.Organization
    }
  }

  let verticalContent: boolean = false
  $: verticalContent = $deviceInfo.isMobile && $deviceInfo.isPortrait
  let btn: HTMLButtonElement

  $: color = selectedState
    ? getPlatformColorDef(selectedState.color ?? getColorNumberByText(selectedState.name), $themeStore.dark)
    : undefined
</script>

<FocusHandler {manager} />

<Card
  label={recruit.string.MoveApplication}
  okAction={updateApplication}
  okLabel={presentation.string.Save}
  canSave={status.severity === Severity.OK}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      <Label label={recruit.string.MoveApplication} />
    </div>
  </svelte:fragment>
  <StatusControl slot="error" {status} />
  <div class:candidate-vacancy={!verticalContent} class:flex-col={verticalContent}>
    <div class="vacancyList">
      <ListView count={selected.length}>
        <svelte:fragment slot="item" let:item>
          <ApplicationPresenter value={selected[item]} />
        </svelte:fragment>
      </ListView>
    </div>

    <div class="flex-center" class:rotate={verticalContent}>
      <ExpandRightDouble />
    </div>
    <div class="flex-grow">
      <SpaceSelect
        _class={recruit.class.Vacancy}
        spaceQuery={{ archived: false }}
        spaceOptions={orgOptions}
        label={recruit.string.Vacancy}
        create={{
          component: recruit.component.CreateVacancy,
          label: recruit.string.CreateVacancy
        }}
        bind:value={_space}
        on:change={(evt) => {
          _space = evt.detail
        }}
        component={VacancyOrgPresenter}
        componentProps={{ inline: true }}
      >
        <svelte:fragment slot="content">
          <VacancyCard {vacancy} disabled={true} />
        </svelte:fragment>
      </SpaceSelect>
    </div>
  </div>

  <svelte:fragment slot="pool">
    {#if states.length > 0}
      <Button
        focusIndex={3}
        width={'min-content'}
        size={'large'}
        bind:input={btn}
        on:click={() => {
          showPopup(
            ColorPopup,
            { value: states, searchable: true, placeholder: ui.string.SearchDots },
            btn,
            (result) => {
              if (result && result.id) {
                selectedState = { ...result, _id: result.id, name: result.label }
              }
              manager.setFocusPos(3)
            }
          )
        }}
      >
        <div slot="content" class="flex-row-center" class:empty={!selectedState}>
          {#if selectedState}
            <div class="color" style:background-color={color?.color ?? defaultBackground($themeStore.dark)} />
            <span class="label overflow-label">{selectedState.name}</span>
          {:else}
            <div class="color" />
            <span class="label overflow-label"><Label label={presentation.string.NotSelected} /></span>
          {/if}
        </div>
      </Button>
    {/if}
  </svelte:fragment>
</Card>

<style lang="scss">
  .candidate-vacancy {
    display: grid;
    grid-template-columns: 3fr 1fr 3fr;
    grid-template-rows: 1fr;
  }
  .rotate {
    transform: rotate(90deg);
  }
  .color {
    margin-right: 0.375rem;
    width: 0.875rem;
    height: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
  }
  .label {
    flex-grow: 1;
    min-width: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .empty {
    .color {
      border-color: var(--theme-content-color);
    }
    .label {
      color: var(--theme-content-color);
    }
    &:hover .color {
      border-color: var(--theme-caption-color);
    }
    &:hover .label {
      color: var(--theme-caption-color);
    }
  }

  .vacancyList {
    padding: 1rem 1.5rem 1.25rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;
    transition-property: box-shadow, background-color, border-color;
    transition-timing-function: var(--timing-shadow);
    transition-duration: 0.15s;
    user-select: text;
    min-width: 15rem;
    min-height: 15rem;

    &:hover {
      box-shadow: var(--accent-shadow);
    }
  }
</style>
