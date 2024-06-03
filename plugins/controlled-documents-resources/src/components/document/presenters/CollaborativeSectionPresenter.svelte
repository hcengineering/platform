<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { CollaborativeDocumentSection } from '@hcengineering/controlled-documents'
  import { WithLookup } from '@hcengineering/core'
  import { getPanelURI, Icon } from '@hcengineering/ui'
  import documents from '../../../plugin'

  export let value: WithLookup<CollaborativeDocumentSection> | undefined
  export let inline = false
</script>

{#if value}
  <a
    class="flex-presenter"
    href="#{getPanelURI(documents.component.EditDoc, value.attachedTo, value.attachedToClass, 'content')}"
    class:inline-presenter={inline}
  >
    <div class="icon">
      <Icon icon={documents.icon.Document} size={'small'} />
    </div>
    <span class="label nowrap">{value.title}</span>
  </a>
{/if}
