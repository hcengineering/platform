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
  import attachment from '@hcengineering/attachment'
  import contact, { Channel, Contact, formatName } from '@hcengineering/contact'
  import { Hierarchy } from '@hcengineering/core'
  import { Avatar, createQuery } from '@hcengineering/presentation'
  import { Component, Label, showPanel } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import ChannelsEditor from './ChannelsEditor.svelte'

  export let object: Contact
  export let disabled: boolean = false

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  channelsQuery.query(
    contact.class.Channel,
    {
      attachedTo: object._id
    },
    (res) => {
      channels = res
    }
  )
</script>

<div class="flex-col h-full card-container">
  <div class="label uppercase"><Label label={contact.string.Person} /></div>
  <div class="flex-center logo">
    <Avatar avatar={object.avatar} size={'large'} icon={contact.icon.Company} />
  </div>
  {#if object}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="name lines-limit-2"
      class:over-underline={!disabled}
      on:click={() => {
        if (!disabled) showPanel(view.component.EditDoc, object._id, Hierarchy.mixinOrClass(object), 'content')
      }}
    >
      {formatName(object.name)}
    </div>
    <div class="description overflow-label">{object.city ?? ''}</div>
    <div class="footer flex flex-reverse flex-grow">
      <div class="flex-center flex-wrap">
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: object.attachments, object, size: 'medium', showCounter: true }}
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

    &:hover {
      background-color: var(--board-card-bg-hover);
      border-color: var(--button-border-color);
      box-shadow: var(--accent-shadow);
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
    .footer {
      margin-top: 1.5rem;
      // overflow: hidden;
    }
  }
</style>
