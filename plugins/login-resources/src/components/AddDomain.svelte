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
  import { Data } from '@hcengineering/core'
  import { Card } from '@hcengineering/presentation'
  import setting, { DomainSetting } from '@hcengineering/setting'
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { createWorkspaceDomain } from '../utils'

  let object: Data<DomainSetting> = {
    domain: '',
  }

  const dispatch = createEventDispatcher()

  $: canSave = true // TODO: validate

  export function canClose (): boolean {
    return !canSave
  }

  async function createDomain () {
    if (!canSave) {
      return
    }

    await createWorkspaceDomain(object.domain)
  }
</script>

<Card
  label={setting.string.AddDomain}
  okAction={createDomain}
  {canSave}
  okLabel={setting.string.SaveDomain}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="title" let:label>
    <Label {label} />
  </svelte:fragment>
  <EditBox
    format={'domain'}
    bind:value={object.domain}
    placeholder={setting.string.EnterDomain}
    kind={'large-style'}
    autoFocus
  />
 
  
</Card>
