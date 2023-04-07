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
  import { createEventDispatcher } from 'svelte'
  import templates from '../plugin'

  export let value: MessageTemplate

  const client = getClient()

  async function save (): Promise<void> {
    await client.createDoc(value._class, space, {
      title: value.title,
      message: value.message
    })
  }

  let space: Ref<TemplateCategory>
  const dispatch = createEventDispatcher()
</script>

<Card
  label={templates.string.Copy}
  okAction={save}
  okLabel={presentation.string.Save}
  on:close={() => dispatch('close')}
  fullSize
  canSave={space !== undefined && value.space !== space}
  on:changeContent
>
  <SpaceSelector bind:space _class={templates.class.TemplateCategory} label={templates.string.Copy} />
</Card>
