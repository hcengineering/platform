<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import { createQuery } from '@hcengineering/presentation'
  import process from '../plugin'

  import RequestsExtension from './RequestsExtension.svelte'

  export let doc: Card
  export let hidden: boolean = false

  const query = createQuery()
  let hasRequests = false

  $: {
    if (doc) {
      query.query(process.class.ApproveRequest, { card: doc._id }, (res) => {
        hasRequests = res.length > 0
      })
    } else {
      query.unsubscribe()
      hasRequests = false
    }
  }
</script>

{#if !hidden && hasRequests}
  <div class="requests__section">
    <RequestsExtension card={doc} on:loaded />
  </div>
{/if}

<style lang="scss">
  .requests__section {
    display: flex;
    flex-direction: column;
    padding: 0 1rem;
    width: 100%;
  }
</style>
