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
  import { Organization } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/presentation'
  import { closePanel, closePopup, closeTooltip, getCurrentLocation, Label, navigate } from '@hcengineering/ui'
  import contact from '../plugin'

  export let organization: Organization
  export let disabled: boolean = false
</script>

<div class="flex-col h-full card-container">
  <div class="label uppercase"><Label label={contact.string.Organization} /></div>
  <div class="flex-center logo">
    <Avatar avatar={organization.avatar} size={'large'} icon={contact.icon.Company} />
  </div>
  {#if organization}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="name lines-limit-2"
      class:over-underline={!disabled}
      on:click={() => {
        if (!disabled) {
          closeTooltip()
          closePopup()
          closePanel()
          const loc = getCurrentLocation()
          loc.path[3] = organization._id
          loc.path.length = 4
          navigate(loc)
        }
      }}
    >
      {organization.name}
    </div>
    {#if organization}
      <span class="label">{organization.name}</span>
    {/if}
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
    user-select: text;

    &:hover {
      background-color: var(--board-card-bg-hover);
      border-color: var(--button-border-color);
      box-shadow: var(--accent-shadow);
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
      color: var(--dark-color);
    }
    .name {
      margin: 1rem 0 0.25rem;
      font-weight: 500;
      font-size: 1rem;
      color: var(--caption-color);
    }
  }
</style>
