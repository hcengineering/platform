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
  import { DocNotifyContext } from '@hcengineering/notification'
  import { Doc } from '@hcengineering/core'
  import { getDocLinkTitle, getDocTitle } from '@hcengineering/view-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import chunter from '@hcengineering/chunter'
  import NotifyContextIcon from './NotifyContextIcon.svelte'

  export let value: DocNotifyContext

  const objectQuery = createQuery()

  let object: Doc | undefined

  $: objectQuery.query(value.objectClass, { _id: value.objectId, space: value.objectSpace }, (res) => {
    object = res[0]
  })

  async function getTitle (object: Doc) {
    const client = getClient()
    if (object._class === chunter.class.DirectMessage) {
      return await getDocTitle(client, object._id, object._class, object)
    }
    return await getDocLinkTitle(client, object._id, object._class, object)
  }
</script>

{#if object}
  <div class="flex-presenter">
    <NotifyContextIcon {value} {object} size="small" />
    <div class="mr-4" />

    {#await getTitle(object) then title}
      {title}
    {/await}
  </div>
{/if}
