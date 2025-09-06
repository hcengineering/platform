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
  import { Card, CardEvents } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { onMount } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'
  import communication from '@hcengineering/communication'
  import { getMetadata } from '@hcengineering/platform'

  import EditCardNew from './EditCardNew.svelte'
  import EditCardOld from './EditCardOld.svelte'

  export let _id: Ref<Card>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let allowClose: boolean = true

  export function canClose (): boolean {
    return false
  }

  onMount(() => {
    Analytics.handleEvent(CardEvents.CardOpened, { id: _id })
  })
</script>

{#if getMetadata(communication.metadata.Enabled) === true}
  <EditCardNew {_id} {readonly} {embedded} {allowClose} on:close on:open />
{:else}
  <EditCardOld {_id} {readonly} {embedded} on:close on:open />
{/if}
