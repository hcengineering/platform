<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { createEventDispatcher } from 'svelte'

  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card } from '@hcengineering/presentation'
  import { EditBox } from '@hcengineering/ui'

  import textEditorPlugin from '../plugin'

  export let link = ''

  const dispatch = createEventDispatcher()
  const linkPlaceholder = getEmbeddedLabel('http://my.link.net')

  function save () {
    dispatch('update', link)
  }
</script>

<Card
  label={textEditorPlugin.string.Link}
  okLabel={textEditorPlugin.string.Save}
  okAction={save}
  canSave
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <EditBox placeholder={linkPlaceholder} bind:value={link} autoFocus />
</Card>
