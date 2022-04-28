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
  import type { Vacancy } from '@anticrm/recruit'
  import { closePanel, closePopup, closeTooltip, getCurrentLocation, Label, navigate } from '@anticrm/ui'
  import VacancyIcon from './icons/Vacancy.svelte'
  import contact, { Organization } from '@anticrm/contact'
  import recruit from '../plugin'
  import { getClient } from '@anticrm/presentation'
  import { Ref } from '@anticrm/core'

  export let vacancy: Vacancy
  export let disabled: boolean = false
  let company: Organization | undefined

  $: getOrganization(vacancy?.company)
  const client = getClient()

  async function getOrganization (_id: Ref<Organization> | undefined): Promise<void> {
    if (_id === undefined) {
      company = undefined
    } else {
      company = await client.findOne(contact.class.Organization, { _id })
    }
  }
</script>

<div class="flex-col h-full card-container">
  <div class="label uppercase"><Label label={recruit.string.Vacancy} /></div>
  <div class="flex-center logo">
    <VacancyIcon size={'large'} />
  </div>
  {#if vacancy}
    <div
      class="name lines-limit-2"
      class:over-underline={!disabled}
      on:click={() => {
        if (!disabled) {
          closeTooltip()
          closePopup()
          closePanel()
          const loc = getCurrentLocation()
          loc.path[2] = vacancy._id
          loc.path.length = 3
          navigate(loc)
        }
      }}
    >
      {vacancy.name}
    </div>
    {#if company}
      <span class="label">{company.name}</span>
    {/if}
    <div class="description lines-limit-2">{vacancy.description ?? ''}</div>
  {/if}
</div>

<style lang="scss">
  .card-container {
    padding: 1rem 1.5rem 1.25rem;
    background-color: var(--board-card-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;
    transition-property: box-shadow, background-color, border-color;
    transition-timing-function: var(--timing-shadow);
    transition-duration: 0.15s;

    &:hover {
      background-color: var(--board-card-bg-hover);
      border-color: var(--button-border-color);
      box-shadow: rgb(0 0 0 / 15%) 0px 4px 8px;
    }

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
      font-size: 0.625rem;
      color: var(--theme-content-dark-color);
    }
    .name {
      margin: 1rem 0 0.25rem;
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
    }
    .description {
      font-size: 0.75rem;
      color: var(--theme-content-dark-color);
    }
  }
</style>
