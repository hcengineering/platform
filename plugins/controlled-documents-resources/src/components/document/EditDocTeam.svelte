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
  import { Scroller } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import { ControlledDocument, ControlledDocumentState, DocumentState } from '@hcengineering/controlled-documents'
  import { Employee } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'

  import DocTeam from './DocTeam.svelte'

  export let controlledDoc: ControlledDocument
  export let editable: boolean = true

  $: canChangeCoAuthors =
    editable && controlledDoc.state === DocumentState.Draft && controlledDoc.controlledState == null
  $: canChangeReviewers =
    editable && controlledDoc.state === DocumentState.Draft && controlledDoc.controlledState == null
  $: canChangeApprovers =
    editable &&
    ((controlledDoc.state === DocumentState.Draft && controlledDoc.controlledState == null) ||
      controlledDoc.controlledState === ControlledDocumentState.InReview ||
      controlledDoc.controlledState === ControlledDocumentState.Reviewed)

  const client = getClient()

  async function handleUpdate ({
    detail
  }: {
    detail: { type: 'reviewers' | 'approvers', users: Ref<Employee>[] }
  }): Promise<void> {
    const { type, users } = detail

    await client.update(controlledDoc, { [type]: users })
  }
</script>

{#if controlledDoc}
  <Scroller>
    <div class="content">
      <DocTeam
        space={controlledDoc.space}
        {controlledDoc}
        {canChangeCoAuthors}
        {canChangeReviewers}
        {canChangeApprovers}
        on:update={handleUpdate}
      />
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .content {
    padding: 1.5rem 3.25rem;
  }
</style>
