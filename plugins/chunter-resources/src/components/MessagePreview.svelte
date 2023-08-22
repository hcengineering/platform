<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { ChunterMessage } from '@hcengineering/chunter'
  import { MessageViewer } from '@hcengineering/presentation'
  import ui, { Label, tooltip } from '@hcengineering/ui'
  import { LinkPresenter } from '@hcengineering/view-resources'
  import { AttachmentList } from '@hcengineering/attachment-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Ref, WithLookup, getCurrentAccount } from '@hcengineering/core'
  import { Attachment } from '@hcengineering/attachment'
  import { EmployeePresenter, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { PersonAccount } from '@hcengineering/contact'

  import chunter from '../plugin'
  import { getLinks, getTime } from '../utils'

  export let value: WithLookup<ChunterMessage>

  $: attachments = (value.$lookup?.attachments ?? []) as Attachment[]

  $: links = getLinks(value.content)

  const me = getCurrentAccount()._id as Ref<PersonAccount>

  let account: PersonAccount | undefined

  $: account = $personAccountByIdStore.get(value.createdBy as Ref<PersonAccount>)
  $: employee = account && $personByIdStore.get(account.person)
</script>

<div class="container clear-mins" class:highlighted={false} id={value._id}>
  <div class="message clear-mins">
    <div class="flex-row-center header clear-mins">
      {#if employee && account}
        {#if account._id !== me}
          <EmployeePresenter value={employee} shouldShowAvatar={true} disabled />
        {:else}
          <Label label={chunter.string.You} />
        {/if}
      {/if}
      <span>{getTime(value.createdOn ?? 0)}</span>
      {#if value.editedOn}
        <span use:tooltip={{ label: ui.string.TimeTooltip, props: { value: getTime(value.editedOn) } }}>
          <Label label={getEmbeddedLabel('Edited')} />
        </span>
      {/if}
    </div>
    <div class="text"><MessageViewer message={value.content} /></div>
    {#if value.attachments}
      <div class="attachments">
        <AttachmentList {attachments} />
      </div>
    {/if}
    {#each links as link}
      <LinkPresenter {link} />
    {/each}
  </div>
</div>

<style lang="scss">
  @keyframes highlight {
    50% {
      background-color: var(--theme-warning-color);
    }
  }
  .container {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.5rem 0.15rem;

    &.highlighted {
      animation: highlight 2000ms ease-in-out;
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 1rem;

      .header {
        display: flex;
        font-weight: 500;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: 0.25rem;

        span {
          margin-left: 0.5rem;
          font-weight: 400;

          line-height: 1.125rem;
          opacity: 0.4;
        }
      }
      .text {
        line-height: 150%;
        user-select: contain;
      }
      .attachments {
        margin-top: 0.25rem;
      }
    }
  }
</style>
