<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { recruitId, Vacancy } from '@hcengineering/recruit'
  import { Button, Icon, IconAdd, Label, Loading, Scroller, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { NavLink, Table, ViewletsSettingButton } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'
  import IconApplication from './icons/Application.svelte'
  import FileDuo from './icons/FileDuo.svelte'
  import SectionEmpty from './SectionEmpty.svelte'

  export let objectId: Ref<Vacancy>
  export let readonly = false
  let applications: number

  const query = createQuery()
  $: query.query(
    recruit.class.Applicant,
    { space: objectId },
    (res) => {
      applications = res.total
    },
    { total: true, limit: 1 }
  )

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateApplication, { space: objectId, preserveVacancy: true }, ev.target as HTMLElement)
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true
</script>

<div class="antiSection max-h-125 clear-mins">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={IconApplication} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <NavLink app={recruitId} space={objectId}>
        <Label label={recruit.string.Applications} />
      </NavLink>
    </span>
    <div class="flex-row-center gap-2 reverse">
      <ViewletsSettingButton
        viewletQuery={{ _id: recruit.viewlet.VacancyApplicationsShort }}
        kind={'tertiary'}
        bind:viewlet
        bind:preference
        bind:loading
      />
      {#if !readonly}
        <Button id="appls.add" icon={IconAdd} kind={'ghost'} on:click={createApp} />
      {/if}
    </div>
  </div>
  {#if applications > 0}
    {#if viewlet !== undefined && !loading}
      <Scroller horizontal>
        <Table
          _class={recruit.class.Applicant}
          config={preference?.config ?? viewlet.config}
          query={{ space: objectId }}
          loadingProps={{ length: applications }}
          {readonly}
        />
      </Scroller>
    {:else}
      <Loading />
    {/if}
  {:else}
    <SectionEmpty icon={FileDuo} label={recruit.string.NoApplicationsForVacancy}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      {#if !readonly}
        <span class="over-underline content-color" on:click={createApp}>
          <Label label={recruit.string.CreateAnApplication} />
        </span>
      {/if}
    </SectionEmpty>
  {/if}
</div>
