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
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import { AccountUuid } from '@hcengineering/core'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import { Grid, Label, Toggle } from '@hcengineering/ui'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { createEventDispatcher } from 'svelte'

  import gmail from '../plugin'

  export let integration: Integration
  let shared = (integration.shared?.length ?? 0) > 0

  const currentEmployee = getCurrentEmployee()
  const client = getClient()

  async function change (shared: AccountUuid[]) {
    integration.shared = shared
    await client.update(integration, {
      shared
    })
  }

  async function disable () {
    if (!shared) {
      await change([])
    }
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={gmail.string.Shared}
  okAction={() => {
    dispatch('close')
  }}
  canSave={true}
  fullSize
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <div style="width: 25rem;">
    <Grid rowGap={1}>
      <div>
        <Label label={gmail.string.Shared} />
      </div>
      <Toggle bind:on={shared} on:change={disable} />
      {#if shared}
        <div>
          <Label label={gmail.string.AvailableTo} />
        </div>
        <AccountArrayEditor
          kind={'regular'}
          label={gmail.string.AvailableTo}
          excludeItems={[currentEmployee]}
          value={integration.shared ?? []}
          onChange={(res) => change(res)}
        />
      {/if}
    </Grid>
  </div>
</Card>
