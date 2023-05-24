<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { ChunterSpace } from '@hcengineering/chunter'
  import type { Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import chunter from '../plugin'
  import DmHeader from './DmHeader.svelte'
  import ChannelHeader from './ChannelHeader.svelte'

  export let spaceId: Ref<ChunterSpace> | undefined
  export let withSearch: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()
  let channel: ChunterSpace | undefined

  $: query.query(chunter.class.ChunterSpace, { _id: spaceId }, (result) => {
    channel = result[0]
  })
</script>

{#if channel}
  {#if hierarchy.isDerived(channel._class, chunter.class.DirectMessage)}
    <DmHeader {spaceId} {withSearch} />
  {:else}
    <ChannelHeader {spaceId} />
  {/if}
{/if}
