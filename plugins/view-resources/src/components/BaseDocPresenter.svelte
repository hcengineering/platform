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
  import { IconSize } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Doc } from '@hcengineering/core'
  import ObjectIcon from './ObjectIcon.svelte'

  import { getDocLinkTitle } from '../utils'

  export let object: Doc | undefined = undefined
  export let value: Doc | undefined = undefined
  export let size: IconSize = 'small'

  $: _object = object ?? value

  const client = getClient()
</script>

{#if _object}
  <div class="flex-presenter">
    <ObjectIcon value={_object} {size}/>
    {#await getDocLinkTitle(client, _object._id, _object._class, _object) then title}
      {title}
    {/await}
  </div>
{/if}
