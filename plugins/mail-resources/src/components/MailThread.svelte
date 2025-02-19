<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  import { getResource } from '@hcengineering/platform'
  import { ActionContext, getClient } from '@hcengineering/presentation'
  import { type Class, type Ref } from '@hcengineering/core'
  import mail, { MailThread, MailMessage } from '@hcengineering/mail'
  import { Panel } from '@hcengineering/panel'
  import { type AnySvelteComponent, Button, Component, Loading, showPopup } from '@hcengineering/ui'
  import chunter from '@hcengineering/chunter'
  import view, { type ObjectPresenter } from '@hcengineering/view'

  import { getReplySubject } from '../messageUtils'

  export let _id: Ref<MailThread>
  export let _class: Ref<Class<MailThread>>

  const messageClass = mail.class.MailMessage
  let messages: MailMessage[] = []
  let isLoading = true

  let object: MailThread | undefined

  const dispatch = createEventDispatcher()

  const client = getClient()

  let messagePresenter: AnySvelteComponent | undefined = undefined

  $: if (_id !== undefined && _class !== undefined) {
    void load()
  }

  async function load (): Promise<void> {
    isLoading = true
    try {
      await Promise.all([findThread(), findMessages(), findMessagePresenter()])
    } catch (err) {
      console.error(err)
    } finally {
      isLoading = false
    }
  }

  async function findMessagePresenter (): Promise<void> {
    const presenterMixin: ObjectPresenter | undefined = getClient()
      .getHierarchy()
      .classHierarchyMixin(chunter.class.ChatMessage, view.mixin.ObjectPresenter) as any
    if (presenterMixin?.presenter !== undefined) {
      messagePresenter = await getResource(presenterMixin.presenter)
    }
  }

  async function findMessages (): Promise<void> {
    const result = await client.findAll(messageClass, { attachedTo: _id })
    if (Array.isArray(result)) {
      messages = result
    } else {
      console.warn('Failed to find messages for thread', result)
    }
  }

  async function findThread (): Promise<void> {
    object = await client.findOne(_class, { _id })
  }

  async function reply (): Promise<void> {
    showPopup(mail.component.CreateMail, {
      to: object?.from,
      from: object?.to,
      subject: getReplySubject(object?.subject ?? ''),
      mailThreadId: object?.mailThreadId
    })
  }

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object !== undefined}
  <ActionContext context={{ mode: 'editor' }} />
  <Panel
    {object}
    title={object.subject}
    isHeader={false}
    isAside={false}
    isSub={false}
    adaptive={'disabled'}
    withoutActivity
    on:open
    on:close={() => dispatch('close')}
  >
    <svelte:fragment slot="utils">
      <Button disabled={isLoading} label={mail.string.Reply} kind={'primary'} on:click={reply} />
    </svelte:fragment>
    {#if isLoading}
      <Loading />
    {:else if messagePresenter !== undefined}
      {#each messages as message}
        <Component is={messagePresenter} props={{ value: message, readonly: true, isMarkdown: true }} />
      {/each}
    {/if}
  </Panel>
{/if}
