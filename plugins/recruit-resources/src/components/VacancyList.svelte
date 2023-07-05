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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Button, Icon, IconAdd, Label, showPopup, Scroller } from '@hcengineering/ui'
  import view, { BuildModelKey } from '@hcengineering/view'
  import { Table } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateVacancy from './CreateVacancy.svelte'
  import FileDuo from './icons/FileDuo.svelte'

  export let objectId: Ref<Doc>
  export let vacancies: number | undefined

  const createApp = (ev: MouseEvent): void => {
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
    <Button id="appls.add" icon={IconAdd} kind={'ghost'} on:click={createApp} />
  </div>
  {#if (vacancies ?? 0) > 0}
    <Scroller horizontal>
      <Table
        _class={recruit.class.Vacancy}
        {config}
        query={{ company: objectId }}
        loadingProps={{ length: vacancies ?? 0 }}
      />
    </Scroller>
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <div class="caption-color">
        <FileDuo size={'large'} />
      </div>
      <span class="content-dark-color">
        <Label label={getEmbeddedLabel('No Vacancies')} />
      </span>
      <span class="over-underline content-color" on:click={createApp}>
        <Label label={recruit.string.CreateVacancy} />
      </span>
    </div>
  {/if}
</div>
