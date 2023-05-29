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

<div class="antiContactCard" class:inline>
  {#if !inline}
    <div class="label uppercase"><Label label={recruit.string.Vacancy} /></div>
    <div class="flex-center logo">
      <VacancyIcon size={'large'} />
    </div>
  {/if}
  {#if vacancy}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <NavLink {disabled} space={vacancy._id} app={recruitId}>
      <div class="name">
        {#if inline}
          <div class="flex-row-center">
            <VacancyIcon size={'small'} />
            <span class="ml-2">
              {vacancy.name}
            </span>
          </div>
        {:else}
          {vacancy.name}
        {/if}
      </div>
    </NavLink>
    {#if company}
      <span class="label overflow-label">{company.name}</span>
    {/if}
    {#if !inline || vacancy.description}
      <div class="description lines-limit-2 text-md">{vacancy.description ?? ''}</div>
    {/if}

    <div class="footer">
      <div class="flex-row-center gap-2">
        <Component
          is={chunter.component.CommentsPresenter}
          props={{ value: vacancy.comments, object: vacancy, size: 'small', showCounter: true }}
        />
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: vacancy.attachments, object: vacancy, size: 'small', showCounter: true }}
        />
      </div>
      {#if channels[0]}
        <ChannelsEditor
          attachedTo={channels[0].attachedTo}
          attachedClass={channels[0].attachedToClass}
          length={'short'}
          editable={false}
        />
      {/if}
    </div>
  {/if}
</div>
