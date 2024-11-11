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
  import type { Doc, Ref } from '@hcengineering/core'
  import { Button, IconAdd, Label, Scroller, Section, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletsSettingButton } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'
  import IconApplication from './icons/Application.svelte'
  import FileDuo from './icons/FileDuo.svelte'
  import SectionEmpty from './SectionEmpty.svelte'

  export let objectId: Ref<Doc>
  export let applications: number
  export let readonly: boolean = false

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateApplication, { candidate: objectId, preserveCandidate: true }, ev.target as HTMLElement)
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true
</script>

<Section label={recruit.string.Applications} icon={IconApplication}>
  <svelte:fragment slot="header">
    <div class="flex-row-center gap-2 reverse">
      <ViewletsSettingButton
        viewletQuery={{ _id: recruit.viewlet.VacancyApplicationsEmbeddeed }}
        kind={'tertiary'}
        bind:viewlet
        bind:loading
        bind:preference
      />
      {#if !readonly}
        <Button id="appls.add" icon={IconAdd} kind={'ghost'} on:click={createApp} />
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if applications > 0 && viewlet !== undefined && !loading}
      <Scroller horizontal>
        <Table
          _class={recruit.class.Applicant}
          config={preference?.config ?? viewlet.config}
          query={{ attachedTo: objectId, ...(viewlet?.baseQuery ?? {}) }}
          loadingProps={{ length: applications }}
          {readonly}
        />
      </Scroller>
    {:else}
      <SectionEmpty icon={FileDuo} label={recruit.string.NoApplicationsForTalent}>
        {#if !readonly}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <span class="over-underline content-color" on:click={createApp}>
            <Label label={recruit.string.CreateAnApplication} />
          </span>
        {/if}
      </SectionEmpty>
    {/if}
  </svelte:fragment>
</Section>
