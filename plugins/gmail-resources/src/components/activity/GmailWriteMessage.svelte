<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import { Message } from '@hcengineering/gmail'
  import { showPopup } from '@hcengineering/ui'

  import gmail from '../../plugin'
  import Main from '../Main.svelte'

  export let _id: Ref<Message> | undefined = undefined
  export let value: Message | undefined = undefined

  export let onClick: ((ev: MouseEvent) => void) | undefined = undefined
  const query = createQuery()

  let doc: Message | undefined = undefined

  $: loadObject(_id, value)

  function loadObject (_id?: Ref<Message>, value?: Message): void {
    if (value === undefined && _id !== undefined) {
      query.query(gmail.class.Message, { _id }, (res) => {
        doc = res[0]
      })
    } else {
      doc = value
      query.unsubscribe()
    }
  }

  async function click (ev: MouseEvent): Promise<void> {
    ev.stopPropagation()

    if (onClick) {
      onClick(ev)
      return
    }

    if (doc === undefined) {
      return
    }

    const client = getClient()
    const channel = await client.findOne(doc.attachedToClass, { _id: doc.attachedTo })
    if (channel !== undefined) {
      showPopup(Main, { channel, message: doc }, 'float')
    }
  }
</script>

{#if doc}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span class="over-underline overflow-label" on:click={click}>{doc.subject}</span>
{/if}
