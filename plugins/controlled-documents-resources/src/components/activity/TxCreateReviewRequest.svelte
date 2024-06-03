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
  import { Ref } from '@hcengineering/core'
  import { Request } from '@hcengineering/request'
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { ControlledDocument } from '@hcengineering/controlled-documents'

  import documents from '../../plugin'

  export let value: Request

  let controlledDoc: ControlledDocument | undefined
  const docQuery = createQuery()
  $: docQuery.query(documents.class.ControlledDocument, { _id: value.attachedTo as Ref<ControlledDocument> }, (rev) => {
    ;[controlledDoc] = rev
  })
</script>

{#if controlledDoc}
  <span>
    <Label label={documents.string.DocumentReviewRequest} />
    "{controlledDoc.title}"
  </span>
{/if}
