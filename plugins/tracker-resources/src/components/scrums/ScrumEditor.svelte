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
  import { getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import type { Scrum } from '@hcengineering/tracker'
  import { EditBox } from '@hcengineering/ui'
  import { DocAttributeBar } from '@hcengineering/view-resources'
  import tracker from '../../plugin'

  export let scrum: Scrum

  const client = getClient()

  async function change (field: string, value: any) {
    await client.update(scrum, { [field]: value })
  }
</script>

<div class="popupPanel-body__aside flex shown">
  <div class="p-4 w-60 left-divider">
    <div class="fs-title text-xl">
      <EditBox bind:value={scrum.title} on:change={() => scrum.title && change('title', scrum.title)} />
    </div>
    <div class="mt-2">
      <StyledTextBox
        alwaysEdit
        showButtons={false}
        placeholder={tracker.string.Description}
        content={scrum.description ?? ''}
        on:value={(evt) => change('description', evt.detail)}
      />
    </div>
    <DocAttributeBar object={scrum} ignoreKeys={['title', 'description']} />
  </div>
</div>
