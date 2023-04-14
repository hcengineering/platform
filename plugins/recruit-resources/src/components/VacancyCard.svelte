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
  import attachment from '@hcengineering/attachment'
  import chunter from '@hcengineering/chunter'
  import contact, { Channel, Organization } from '@hcengineering/contact'
  import { ChannelsEditor } from '@hcengineering/contact-resources'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Vacancy, recruitId } from '@hcengineering/recruit'
  import { Component, Label } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import VacancyIcon from './icons/Vacancy.svelte'

  export let vacancy: WithLookup<Vacancy> | undefined
  export let disabled: boolean = false
  export let inline: boolean = false
  let company: Organization | undefined

  $: getOrganization(vacancy, vacancy?.company)
  const client = getClient()

  async function getOrganization (
    vacancy: WithLookup<Vacancy> | undefined,
    _id: Ref<Organization> | undefined
  ): Promise<void> {
    if (vacancy?.$lookup?.company !== undefined) {
      company = vacancy.$lookup?.company
    }
    if (_id === undefined) {
      company = undefined
    } else {
      company = await client.findOne(contact.class.Organization, { _id })
    }
  }

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  $: if (vacancy?.company !== undefined) {
    channelsQuery.query(
      contact.class.Channel,
      {
        attachedTo: vacancy?.company
      },
      (res) => {
        channels = res
      }
    )
  } else {
    channelsQuery.unsubscribe()
  }
</script>

<div class="flex-col h-full card-container" class:inline>
  {#if !inline}
    <div class="label uppercase"><Label label={recruit.string.Vacancy} /></div>
    <div class="flex-center logo">
      <VacancyIcon size={'large'} />
    </div>
  {/if}
  {#if vacancy}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <NavLink {disabled} space={vacancy._id} app={recruitId}>
      <div class="name lines-limit-2">
        <div class="text-md">
          {#if inline}
            <div class="flex-row-center">
              <VacancyIcon size={'small'} />
              <span class="ml-1">
                {vacancy.name}
              </span>
            </div>
          {:else}
            {vacancy.name}
          {/if}
        </div>
      </div>
    </NavLink>
    {#if company}
      <span class="label">{company.name}</span>
    {/if}
    {#if !inline || vacancy.description}
      <div class="description lines-limit-2 text-md">{vacancy.description ?? ''}</div>
    {/if}

    <div class="footer flex flex-reverse flex-grow">
      <div class="flex-center flex-wrap">
        <Component
          is={chunter.component.CommentsPresenter}
          props={{ value: vacancy.comments, object: vacancy, size: 'medium', showCounter: true }}
        />
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: vacancy.attachments, object: vacancy, size: 'medium', showCounter: true }}
        />
      </div>
      {#if channels[0]}
        <div class="flex flex-grow">
          <ChannelsEditor
            attachedTo={channels[0].attachedTo}
            attachedClass={channels[0].attachedToClass}
            length={'short'}
            editable={false}
          />
        </div>
      {/if}
    </div>
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
    min-width: 15rem;
    min-height: 15rem;

    &:hover {
      background-color: var(--board-card-bg-hover);
      border-color: var(--button-border-color);
      box-shadow: var(--accent-shadow);
    }

    .logo {
      width: 4.5rem;
      height: 4.5rem;
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
    .description {
      font-size: 0.75rem;
      color: var(--dark-color);
    }

    &.inline {
      padding: 0.5rem 0.5rem 0.25rem;
      min-width: 1rem;
      min-height: 1rem;

      background-color: inherit;
      border: inherit;
      border-radius: inherit;
      .name {
        margin: 0.25rem 0 0.25rem;
        font-size: 0.75rem;
      }
      .label {
        margin-bottom: 0rem;
      }
    }
  }
</style>
