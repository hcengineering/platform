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
  import { createQuery, HTMLViewer } from '@hcengineering/presentation'
  import { TelegramMessage } from '@hcengineering/telegram'
  import { Ref } from '@hcengineering/core'

  import telegram from '../plugin'

  export let _id: Ref<TelegramMessage> | undefined = undefined
  export let value: TelegramMessage | undefined = undefined

  const query = createQuery()

  let doc: TelegramMessage | undefined = undefined

  $: if (value === undefined && _id !== undefined) {
    query.query(telegram.class.Message, { _id }, (res) => {
      doc = res[0]
    })
  } else {
    doc = value
    query.unsubscribe()
  }
</script>

{#if doc}
  <div class="content lines-limit-2">
    <HTMLViewer value={doc.content} />
  </div>
{/if}

<style lang="scss">
  .content {
    min-width: 0;
    min-height: 1rem;
    max-height: 2.125rem;
  }
</style>
