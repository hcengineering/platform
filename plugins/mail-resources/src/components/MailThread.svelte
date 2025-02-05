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
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { type Class, type Ref } from '@hcengineering/core'
  import { MailThread } from '@hcengineering/mail'
  import { Panel } from '@hcengineering/panel'
  import { type AnySvelteComponent, Component, Loading } from '@hcengineering/ui'
  import chunter from '@hcengineering/chunter'
  import view from '@hcengineering/view'

  export let _id: Ref<MailThread>
  export let _class: Ref<Class<MailThread>>

  const messageClass = chunter.class.ChatMessage
  let messages: Doc[] = []
  let presenterLoading = true
  let messagesLoading = true

  let object: MailThread | undefined

  const dispatch = createEventDispatcher()

  const query = createQuery()

  let messagePresenter: AnySvelteComponent | undefined = undefined

  findMessagePresenter()
  findMessages()

  function findMessagePresenter (): void {
    const presenterMixin = getClient().getHierarchy().classHierarchyMixin(messageClass, view.mixin.ObjectPresenter)
    if (presenterMixin?.presenter !== undefined) {
      getResource(presenterMixin.presenter)
        .then((result) => {
          messagePresenter = result
        })
        .catch((err) => {
          console.error('Failed to find presenter for class ' + messageClass, err)
        })
        .finally(() => {
          presenterLoading = false
        })
    }
  }

  function findMessages (): void {
    query.query(messageClass, { attachedTo: _id }, async (result) => {
      messages = result
      messagesLoading = false
    })
  }

  $: _id !== undefined &&
    _class !== undefined &&
    query.query(_class, { _id }, async (result) => {
      ;[object] = result
    })

  onMount(() => dispatch('open', { ignoreKeys: [] }))
</script>

{#if object !== undefined}
  <ActionContext context={{ mode: 'editor' }} />
  <Panel
    {object}
    isHeader={false}
    isAside={false}
    isSub={false}
    adaptive={'disabled'}
    on:open
    on:close={() => dispatch('close')}
  >
    {#if messagesLoading || presenterLoading }
      <Loading/>
    {:else}
      {#each messages as message}
        <Component is={messagePresenter} props={{ object: message }} />
      {/each}
    {/if}
  </Panel>
{/if}
