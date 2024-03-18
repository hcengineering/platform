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
  import { createQuery } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import { SharedMessages } from '@hcengineering/gmail'

  import gmail from '../../plugin'
  import SharedMessagesView from '../SharedMessages.svelte'

  export let _id: Ref<SharedMessages> | undefined = undefined
  export let value: SharedMessages | undefined = undefined

  const query = createQuery()

  let doc: SharedMessages | undefined = undefined

  $: loadObject(_id, value)

  function loadObject (_id?: Ref<SharedMessages>, value?: SharedMessages): void {
    if (value === undefined && _id !== undefined) {
      query.query(gmail.class.SharedMessages, { _id }, (res) => {
        doc = res[0]
      })
    } else {
      doc = value
      query.unsubscribe()
    }
  }
</script>

{#if doc}
  <SharedMessagesView value={doc} />
{/if}
