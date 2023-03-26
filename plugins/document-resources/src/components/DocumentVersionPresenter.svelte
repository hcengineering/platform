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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { Document, DocumentVersion } from '@hcengineering/document'
  import { getClient } from '@hcengineering/presentation'
  import { getPanelURI, Icon } from '@hcengineering/ui'
  import document from '../plugin'

  export let value: WithLookup<DocumentVersion>
  export let inline = false

  $: doc = value.$lookup?.attachedTo as Document

  $: if (doc === undefined) {
    getClient()
      .findOne(document.class.Document, { _id: value.attachedTo as Ref<Document> })
      .then((res) => {
        doc = res as Document
      })
  }
</script>

{#if value}
  <a
    class="flex-presenter"
    href="#{getPanelURI(document.component.EditDoc, value.attachedTo, value.attachedToClass, 'content')}"
    class:inline-presenter={inline}
  >
    {#if !inline}
      <div class="icon">
        <Icon icon={document.icon.Document} size={'small'} />
      </div>
    {/if}
    <span class="label">
      {doc?.name} - {value.version}
    </span>
  </a>
{/if}
