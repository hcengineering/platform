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

  import { ActionContext, createQuery } from '@hcengineering/presentation'
  import { type Class, type Ref } from '@hcengineering/core'
  import { MailThread } from '@hcengineering/mail'
  import { Panel } from '@hcengineering/panel'

  export let _id: Ref<MailThread>
  export let _class: Ref<Class<MailThread>>

  let object: MailThread | undefined

  const dispatch = createEventDispatcher()

  const query = createQuery()

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
  </Panel>
{/if}
