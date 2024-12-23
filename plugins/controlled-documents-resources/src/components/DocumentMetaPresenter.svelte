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
  import { SortingOrder } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, tooltip } from '@hcengineering/ui'
  import documents, { Document, DocumentMeta, getDocumentName } from '@hcengineering/controlled-documents'

  import document from '../plugin'

  export let value: DocumentMeta

  let lastDoc: Document | undefined
  getClient()
    .findOne(
      documents.class.Document,
      {
        attachedTo: value._id
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
        }
      }
    )
    .then(
      (res) => {
        lastDoc = res
      },
      (err) => {
        console.warn(`Cannot find Document for meta: ${value._id}. Error: ${err}`)
      }
    )
</script>

{#if lastDoc}
  {@const title = getDocumentName(lastDoc)}
  <div class="flex-row-center" use:tooltip={{ label: getEmbeddedLabel(title) }}>
    <div class="icon mr-1">
      <Icon icon={document.icon.Document} size={'small'} />
    </div>
    <span class="label">{title}</span>
  </div>
{/if}
