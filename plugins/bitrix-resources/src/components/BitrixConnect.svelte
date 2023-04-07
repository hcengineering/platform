<!--
//
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
//
-->
<script lang="ts">
  import presentation, { Card } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import bitrix from '../plugin'

  export let integration: Integration

  let url: string = integration.value

  const dispatch = createEventDispatcher()

  function save (): void {
    dispatch('close', { value: url })
  }
</script>

<Card
  label={bitrix.string.BitrixDesc}
  okAction={save}
  canSave={true}
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <EditBox label={bitrix.string.BitrixTokenUrl} bind:value={url} />
  <svelte:fragment slot="pool" />
</Card>
