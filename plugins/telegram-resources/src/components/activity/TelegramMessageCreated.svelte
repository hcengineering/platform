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
  import { createQuery, getClient, HTMLViewer } from '@hcengineering/presentation'
  import { TelegramMessage } from '@hcengineering/telegram'
  import { Ref } from '@hcengineering/core'
  import { buildRemovedDoc, checkIsObjectRemoved } from '@hcengineering/view-resources'

  import telegram from '../../plugin'

  export let _id: Ref<TelegramMessage> | undefined = undefined
  export let value: TelegramMessage | undefined = undefined
  export let preview = false

  const query = createQuery()
  const client = getClient()

  $: value === undefined && _id && loadObject(_id)

  async function loadObject (_id: Ref<TelegramMessage>): Promise<void> {
    const isRemoved = await checkIsObjectRemoved(client, _id, telegram.class.Message)

    if (isRemoved) {
      value = await buildRemovedDoc(client, _id, telegram.class.Message)
    } else {
      query.query(telegram.class.Message, { _id }, (res) => {
        value = res[0]
      })
    }
  }
</script>

{#if value}
  <div class="content lines-limit-2 overflow-label">
    <HTMLViewer value={value.content} {preview} />
  </div>
{/if}

<style lang="scss">
  .content {
    min-width: 0;
    min-height: 1rem;
    max-height: 2.125rem;
  }
</style>
