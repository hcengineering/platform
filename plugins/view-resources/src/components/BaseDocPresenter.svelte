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
  import { type AnySvelteComponent, Icon, IconSize } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Doc } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'

  import { classIcon, getDocLinkTitle } from '../utils'

  export let object: Doc | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let size: IconSize = 'small'

  const client = getClient()
</script>

{#if object}
  {@const objectIcon = icon ?? classIcon(client, object._class)}
  <div class="flex-presenter">
    {#if objectIcon}
      <Icon icon={objectIcon} {size} />
      <div class="mr-4" />
    {/if}
    {#await getDocLinkTitle(client, object._id, object._class, object) then title}
      {title}
    {/await}
  </div>
{/if}
