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
  import { WithLookup } from '@hcengineering/core'
  import { Document, DocumentVersion } from '@hcengineering/document'
  import { getPanelURI, Icon, Label } from '@hcengineering/ui'
  import document from '../plugin'

  export let value: WithLookup<Document>
  export let inline = false

  let lastVersion: DocumentVersion | undefined

  $: if (value.$lookup?.versions !== undefined) {
    let vv = -1
    let dv: DocumentVersion | undefined
    for (const v of value.$lookup.versions as DocumentVersion[]) {
      if (v.version > vv) {
        dv = v
        vv = v.version
      }
    }
    lastVersion = dv
  }
</script>

{#if value}
  <a
    class="flex-presenter"
    href="#{getPanelURI(document.component.EditDoc, value._id, value._class, 'content')}"
    class:inline-presenter={inline}
  >
    <div class="icon">
      <Icon icon={document.icon.Document} size={'small'} />
    </div>
    <span class="label">{value.name}</span>
    <span class="ml-1">
      {#if lastVersion}
        - {lastVersion.version}
        {#if lastVersion.sequenceNumber !== value.editSequence}
          (<Label label={document.string.Revision} /> {lastVersion.sequenceNumber} / {value.editSequence})
        {:else}
          (<Label label={document.string.Revision} /> {value.editSequence})
        {/if}
      {:else}
        (<Label label={document.string.Revision} /> {value.editSequence})
      {/if}
    </span>
  </a>
{/if}
