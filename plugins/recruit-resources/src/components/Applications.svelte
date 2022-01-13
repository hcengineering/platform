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
  import type { Class, Doc, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import task from '@anticrm/task'
  import { CircleButton, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'
  import FileDuo from './icons/FileDuo.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  export let applications: number

  const createApp = (ev: MouseEvent): void =>
    showPopup(CreateApplication, { candidate: objectId, preserveCandidate: true }, ev.target as HTMLElement)
</script>

<div class="applications-container">
  <div class="flex-row-center">
    <div class="title">Applications</div>
    <CircleButton icon={IconAdd} size={'small'} selected on:click={createApp} />
  </div>
  {#if applications > 0}
    <Table 
      _class={recruit.class.Applicant}
      config={['', '$lookup.space.name', '$lookup.state', '$lookup.doneState']}
      options={
        {
          lookup: {
            state: task.class.State,
            space: core.class.Space,
            doneState: task.class.DoneState
          }
        }
      }
      query={ { attachedTo: objectId } }
      loadingProps={ { length: applications } }
    />
  {:else}
    <div class="flex-col-center mt-5 createapp-container">
      <FileDuo size={'large'} />
      <div class="small-text content-dark-color mt-2">
        <Label label={recruit.string.NoApplicationsForCandidate} />
      </div>
      <div class="small-text">
        <a href={'#'} on:click={createApp}><Label label={recruit.string.CreateAnApplication} /></a>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .applications-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: .75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .createapp-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
  }
</style>
