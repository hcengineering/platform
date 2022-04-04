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
  import contact, { Channel, formatName } from '@anticrm/contact'
  import { ChannelsView } from '@anticrm/contact-resources'
  import { Avatar, createQuery } from '@anticrm/presentation'
  import type { Candidate } from '@anticrm/recruit'
  import { Component, Label, showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'
  import chunter from '@anticrm/chunter'
  import attachment from '@anticrm/attachment'
  import recruit from '../plugin'

  export let candidate: Candidate

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  channelsQuery.query(
    contact.class.Channel,
    {
      attachedTo: candidate._id
    },
    (res) => {
      channels = res
    }
  )
</script>

<div class="flex-col h-full card-container">
  <div class="label uppercase"><Label label={recruit.string.Candidate} /></div>
  <Avatar avatar={candidate.avatar} size={'large'} />
  {#if candidate}
    <div class="name lines-limit-2 over-underline" on:click={() => {
      showPanel(view.component.EditDoc, candidate._id, candidate._class, 'full')
    }}>{formatName(candidate.name)}</div>
    <div class="description lines-limit-2">{candidate.title ?? ''}</div>
    <div class="description overflow-label">{candidate.city ?? ''}</div>
    <div class="footer flex flex-reverse flex-grow">
      <div class='flex-center flex-wrap'>
        <Component is={chunter.component.CommentsPresenter} props={{ value: candidate, size: 'medium', showCounter: true }}/>
        <Component is={attachment.component.AttachmentsPresenter} props={{ value: candidate, size: 'medium', showCounter: true }}/>
      </div>
      <div class='flex flex-grow'>
        <ChannelsView value={channels} size={'small'} length={'short'} on:click />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .card-container {
    padding: 1rem 1.5rem 1.25rem;
    background-color: var(--board-card-bg-color);
    border: 1px solid var(--board-card-bg-color);
    border-radius: .25rem;

    &:hover { background-color: var(--board-card-bg-hover); }

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
    .footer { 
      margin-top: 1.5rem;
      overflow: hidden;
    }
  }
</style>