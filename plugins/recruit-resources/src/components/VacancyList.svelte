<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import presentation from '@hcengineering/presentation'
  import { Button, Icon, IconAdd, Label, showPopup, Scroller } from '@hcengineering/ui'
  import view, { BuildModelKey } from '@hcengineering/view'
  import { Table } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateVacancy from './CreateVacancy.svelte'
  import FileDuo from './icons/FileDuo.svelte'
  import SectionEmpty from './SectionEmpty.svelte'

  export let objectId: Ref<Doc>
  export let vacancies: number | undefined
  export let readonly: boolean = false

  const createApp = (ev: MouseEvent): void => {
    if (readonly) return
    showPopup(CreateVacancy, { company: objectId, preserveCompany: true }, ev.target as HTMLElement)
  }
  const config: (BuildModelKey | string)[] = [
    '',
    'comments',
    'attachments',
    {
      key: 'archived',
      presenter: view.component.BooleanTruePresenter,
      label: presentation.string.Archived,
      props: {
        useInvert: false,
        trueColor: 14
      }
    },
    'modifiedOn'
  ]
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={recruit.icon.Vacancy} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={recruit.string.Vacancies} />
    </span>
    {#if !readonly}
      <Button id="appls.add" icon={IconAdd} kind={'ghost'} on:click={createApp} />
    {/if}
  </div>
  {#if (vacancies ?? 0) > 0}
    <Scroller horizontal>
      <Table
        _class={recruit.class.Vacancy}
        {config}
        query={{ company: objectId }}
        {readonly}
        loadingProps={{ length: vacancies ?? 0 }}
      />
    </Scroller>
  {:else}
    <SectionEmpty icon={FileDuo} label={recruit.string.NoVacancies}>
      {#if !readonly}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="over-underline content-color" on:click={createApp}>
          <Label label={recruit.string.CreateVacancy} />
        </span>
      {/if}
    </SectionEmpty>
  {/if}
</div>
