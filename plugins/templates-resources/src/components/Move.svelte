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
  import { Ref } from '@hcengineering/core'
  import presentation, { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { MessageTemplate, TemplateCategory } from '@hcengineering/templates'
  import templates from '../plugin'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  export let value: MessageTemplate

  const client = getClient()

  async function save (): Promise<void> {
    await client.update(value, {
      space
    })
  }

  let space: Ref<TemplateCategory>
  const dispatch = createEventDispatcher()
</script>

<Card
  label={view.string.Move}
  okAction={save}
  okLabel={presentation.string.Save}
  fullSize
  on:close={() => dispatch('close')}
  canSave={space !== value.space}
  on:changeContent
>
  <SpaceSelector bind:space _class={templates.class.TemplateCategory} label={view.string.Move} />
</Card>
