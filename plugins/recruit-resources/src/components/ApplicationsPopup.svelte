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

  import type { Candidate } from '@anticrm/recruit'
  import { CircleButton, Label } from '@anticrm/ui'
  import Vacancy from './icons/Vacancy.svelte'

  export let value: Candidate

  const apps = [{ label: 'Lead analyst', description: 'Tesla' },
                { label: 'Principal analyst', description: 'Google' }]
</script>

<div class="flex-col">
  {#each apps as app}
    <div class="flex-row-center app">
      <div class="app-icon"><CircleButton icon={Vacancy} size={'large'} /></div>
      <div class="flex-grow flex-col">
        <div class="overflow-label label">{app.label}</div>
        <div class="overflow-label desc">{app.description}</div>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .app {
    position: relative;
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
