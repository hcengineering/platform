<!--
//
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
//
-->
<script lang="ts">
  import { Class, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ControlledDocument, DocumentApprovalRequest } from '@hcengineering/controlled-documents'

  import EditDoc from '../EditDoc.svelte'

  export let _id: Ref<DocumentApprovalRequest>
  export let _class: Ref<Class<DocumentApprovalRequest>>
  export let embedded: boolean = false

  let approvalRequest: DocumentApprovalRequest
  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, (result) => {
      ;[approvalRequest] = result
    })

  let controlledDoc: WithLookup<ControlledDocument> | undefined
  const docQuery = createQuery()
  $: if (approvalRequest) {
    docQuery.query<ControlledDocument>(
      approvalRequest.attachedToClass,
      { _id: approvalRequest.attachedTo as Ref<ControlledDocument> },
      (result) => {
        ;[controlledDoc] = result
      }
    )
  } else {
    docQuery.unsubscribe()
  }
</script>

{#key _id}
  {#if controlledDoc}
    <EditDoc _id={controlledDoc._id} _class={controlledDoc._class} {embedded} withClose={false} />
  {/if}
{/key}
