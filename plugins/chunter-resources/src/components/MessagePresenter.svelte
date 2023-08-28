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
  import chunter, { Message } from '@hcengineering/chunter'
  import { Doc } from '@hcengineering/core'
  import { MessageViewer, createQuery, getClient } from '@hcengineering/presentation'
  import { Icon, Label } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter } from '@hcengineering/view-resources'

  import chunterResources from '../plugin'

  export let value: Message
  export let inline: boolean = false
  export let disabled = false

  const client = getClient()
  const isThreadMessage = client.getHierarchy().isDerived(value._class, chunter.class.ThreadMessage)

  let presenter: AttributeModel | undefined
  getObjectPresenter(client, value.attachedToClass, { key: '' }).then((p) => {
    presenter = p
  })

  let doc: Doc | undefined = undefined
  const docQuery = createQuery()
  $: docQuery.query(value.attachedToClass, { _id: value.attachedTo }, (res) => {
    ;[doc] = res
  })
</script>

{#if inline}
  {#if presenter && doc}
    <div class="flex-presenter">
      {#if isThreadMessage}
        <div class="icon">
          <Icon icon={chunter.icon.Thread} size="small" />
        </div>
        <span class="labels-row" style:text-transform="lowercase">
          <Label label={chunterResources.string.On} />
        </span>
        &nbsp;
      {/if}
      <svelte:component this={presenter.presenter} value={doc} inline {disabled} />
    </div>
  {/if}
{:else}
  <div><MessageViewer message={value.content} /></div>
{/if}
