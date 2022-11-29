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
  import { Button, IconAdd, Label, showPopup, Icon } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { Table } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'
  import FileDuo from './icons/FileDuo.svelte'
  import IconApplication from './icons/Application.svelte'

  export let objectId: Ref<Doc>
  // export let space: Ref<Space>
  // export let _class: Ref<Class<Doc>>

  export let applications: number

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateApplication, { candidate: objectId, preserveCandidate: true }, ev.target as HTMLElement)
  }
  const config: (BuildModelKey | string)[] = [
    '',
    '$lookup.space.name',
    '$lookup.space.$lookup.company',
    '$lookup.state',
    '$lookup.doneState'
  ]
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={IconApplication} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={recruit.string.Applications} />
    </span>
    <Button id="appls.add" icon={IconAdd} kind={'transparent'} shape={'circle'} on:click={createApp} />
  </div>
  {#if applications > 0}
    <Table
      _class={recruit.class.Applicant}
      {config}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: applications }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <div class="caption-color">
        <FileDuo size={'large'} />
      </div>
      <span class="dark-color">
        <Label label={recruit.string.NoApplicationsForTalent} />
      </span>
      <span class="over-underline content-accent-color" on:click={createApp}>
        <Label label={recruit.string.CreateAnApplication} />
      </span>
    </div>
  {/if}
</div>
