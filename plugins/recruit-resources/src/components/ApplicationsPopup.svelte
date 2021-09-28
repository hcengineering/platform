<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

  import type { Applicant, Candidate } from '@anticrm/recruit'
  import { CircleButton, showPopup, closeTooltip } from '@anticrm/ui'
  import Vacancy from './icons/Vacancy.svelte'
  import { getClient, createQuery } from '@anticrm/presentation'
  import EditApplication from './EditApplication.svelte'

  import recruit from '@anticrm/recruit'

  export let value: Candidate

  console.log('POPPED UP')

  let applications: Applicant[] = []

  const query = createQuery()
  $: query.query(recruit.class.Applicant, { candidate: value._id }, result => { applications = result })

  const model = getClient().getModel()

  function getApplicationLabel(app: Applicant): string {
    return model.getObject(app.space).name
  }

  function show(app: Applicant) {
    closeTooltip()
    showPopup(EditApplication, { _id: app._id }, 'full')
  }

</script>

<div class="flex-col">
  {#each applications as app}
    <div class="app" on:click={() => show(app)}>
      <div class="app-icon"><CircleButton icon={Vacancy} size={'large'} /></div>
      <div class="flex-grow flex-col">
        <div class="overflow-label label">{getApplicationLabel(app)}</div>
        <div class="overflow-label desc">Cisco</div>
      </div>
      <div class="status" style="background-color: var(--primary-button-enabled)">status</div>
    </div>
  {/each}
</div>

<style lang="scss">
  .app {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .app-icon {
      margin-right: 1.25rem;
      width: 2rem;
      height: 2rem;
    }
    .label { color: var(--theme-caption-color); }
    .desc {
      font-size: .75rem;
      color: var(--theme-content-dark-color);
    }
    .status {
      margin-left: 1rem;
      padding: .5rem .75rem;
      text-transform: uppercase;
      font-weight: 500;
      font-size: .625rem;
      color: #fff;
      border-radius: .5rem;
    }
  }

  .app + .app {
    margin-top: 1.5rem;
    &::before {
      content: '';
      position: absolute;
      top: -.75rem;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--theme-button-border-hovered);
    }
  }
</style>
