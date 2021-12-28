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
  import Company from './icons/Company.svelte'
  import type { Vacancy } from '@anticrm/recruit'

  export let vacancy: Vacancy
</script>

<div class="flex-col h-full card-container">
  <div class="label">VACANCY</div>
  <div class="flex-center logo">
    <Company size={'large'} />
  </div>
  {#if vacancy}
    <div class="name">{vacancy.name}</div>
    <div class="description">{vacancy.description ?? ''}</div>
  {/if}
</div>

<style lang="scss">
  .card-container {
    padding: 1rem 1.5rem 1.25rem;
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;

    .logo {
      width: 5rem;
      height: 5rem;
      color: var(--primary-button-color);
      background-color: var(--primary-button-enabled);
      border-radius: 50%;
    }
    .label {
      margin-bottom: 1.75rem;
      font-weight: 500;
      font-size: .625rem;
      color: var(--theme-content-dark-color);
    }
    .name {
      margin: 1rem 0 .25rem;
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
    }
    .description {
      font-size: .75rem;
      color: var(--theme-content-dark-color);
    }
  }
</style>