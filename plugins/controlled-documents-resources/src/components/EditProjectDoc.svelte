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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Loading } from '@hcengineering/ui'
  import documents, { type ControlledDocument, type ProjectDocument } from '@hcengineering/controlled-documents'

  import EditDocPanel from './EditDocPanel.svelte'

  export let _id: Ref<ProjectDocument>
  export let embedded: boolean = false
  export let withClose: boolean = true

  let doc: WithLookup<ProjectDocument> | undefined
  let controlledDoc: ControlledDocument | undefined

  const query = createQuery()

  $: query.query(
    documents.class.ProjectDocument,
    { _id },
    (res) => {
      ;[doc] = res
      controlledDoc = doc?.$lookup?.document as ControlledDocument
    },
    {
      lookup: {
        document: documents.class.ControlledDocument
      }
    }
  )
</script>

{#if doc !== undefined && controlledDoc !== undefined}
  <EditDocPanel
    _id={controlledDoc._id}
    _class={controlledDoc._class}
    project={doc.project}
    {embedded}
    {withClose}
    on:close
  />
{:else}
  <Loading />
{/if}
