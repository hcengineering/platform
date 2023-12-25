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
  import { Doc } from '@hcengineering/core'
  import { getDocLinkTitle, getDocTitle } from '@hcengineering/view-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Channel } from '@hcengineering/chunter'

  import Header from './Header.svelte'
  import chunter from '../plugin'
  import { getChannelIcon } from '../utils'

  export let object: Doc

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: topic = hierarchy.isDerived(object._class, chunter.class.Channel) ? (object as Channel).topic : undefined

  async function getTitle (object: Doc) {
    if (object._class === chunter.class.DirectMessage) {
      return await getDocTitle(client, object._id, object._class, object)
    }
    return await getDocLinkTitle(client, object._id, object._class, object)
  }
</script>

<div class="ac-header divide full caption-height">
  {#await getTitle(object) then title}
    <Header
      icon={getChannelIcon(object)}
      iconProps={{ value: object }}
      label={title}
      intlLabel={title ? undefined : chunter.string.Channel}
      description={topic}
    />
  {/await}
</div>
