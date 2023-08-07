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
  import { Button, Icon, IconAdd, Label, Loading, resizeObserver, Scroller, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { NavLink, Table, ViewletsSettingButton } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'
  import IconApplication from './icons/Application.svelte'
  import FileDuo from './icons/FileDuo.svelte'

  export let objectId: Ref<Vacancy>
  let applications: number

  const query = createQuery()
  $: query.query(recruit.class.Applicant, { space: objectId }, (res) => {
    applications = res.length
  })

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateApplication, { space: objectId, preserveVacancy: true }, ev.target as HTMLElement)
  }
  let wSection: number

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true
</script>

<div class="antiSection max-h-125 clear-mins" use:resizeObserver={(element) => (wSection = element.clientWidth)}>
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
        kind={'ghost'}
        bind:viewlet
        bind:preference
        bind:loading
      />
      <Button id="appls.add" icon={IconAdd} kind={'ghost'} on:click={createApp} />
    </div>
  </div>
  {#if applications > 0}
    {#if viewlet && !loading}
      <Scroller horizontal>
        <Table
          _class={recruit.class.Applicant}
          config={preference?.config ?? viewlet.config}
          query={{ space: objectId }}
          loadingProps={{ length: applications }}
        />
      </Scroller>
    {:else}
      <Loading />
    {/if}
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <div class="caption-color">
        <FileDuo size={'large'} />
      </div>
      <span class="content-dark-color">
        <Label label={recruit.string.NoApplicationsForVacancy} />
      </span>
      <span class="over-underline content-color" on:click={createApp}>
        <Label label={recruit.string.CreateAnApplication} />
      </span>
    </div>
  {/if}
</div>
