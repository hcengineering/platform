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
  import { type Ref } from '@hcengineering/core'
  import { Label, Scroller, PlainTextEditor } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import documents, { type DocumentSpace, type ChangeControl, DocumentState } from '@hcengineering/controlled-documents'

  import documentsRes from '../../plugin'
  import { $controlledDocument as controlledDocument, $isEditable as isEditable } from '../../stores/editors/document'
  import DocumentBoxItems from '../DocumentBoxItems.svelte'

  const client = getClient()
  let changeControl: ChangeControl
  const ccQuery = createQuery()

  $: if ($controlledDocument != null) {
    ccQuery.query(documents.class.ChangeControl, { _id: $controlledDocument.changeControl }, (res) => {
      ;[changeControl] = res
    })
  } else {
    ccQuery.unsubscribe()
  }

  const spacesQuery = createQuery()
  let docSpaces: Ref<DocumentSpace>[] = []
  spacesQuery.query(documents.class.DocumentSpace, {}, (res) => {
    docSpaces = res.map((s) => s._id)
  })

  async function handleFieldUpdated (field: keyof ChangeControl, ev: UIEvent): Promise<void> {
    if (ev == null) {
      return
    }

    const target = ev.target as HTMLInputElement

    if (target == null) {
      return
    }

    await updateCCField(field, target.value)
  }

  async function updateCCField<T extends keyof ChangeControl> (field: T, value: ChangeControl[T]): Promise<void> {
    if ($controlledDocument == null) {
      return
    }

    await client.updateDoc(
      documents.class.ChangeControl,
      $controlledDocument.space,
      $controlledDocument.changeControl,
      { [field]: value }
    )
  }
</script>

{#if $controlledDocument !== undefined && changeControl}
  <Scroller>
    <div class="root">
      <div class="block">
        <div class="title">
          <Label label={documents.string.Description} />
        </div>
        {#if $isEditable}
          <PlainTextEditor
            value={changeControl.description}
            placeholder={documentsRes.string.DescribeChanges}
            disabled={!$isEditable}
            on:blur={(ev) => {
              void handleFieldUpdated('description', ev)
            }}
          />
        {:else}
          {changeControl.description ?? '—'}
        {/if}
      </div>

      <div class="block">
        <div class="title">
          <Label label={documents.string.Reason} />
        </div>
        {#if $isEditable}
          <PlainTextEditor
            value={changeControl.reason}
            placeholder={documentsRes.string.DescribeReason}
            disabled={!$isEditable}
            on:blur={(ev) => {
              void handleFieldUpdated('reason', ev)
            }}
          />
        {:else}
          {changeControl.reason ?? '—'}
        {/if}
      </div>

      <div class="block">
        <div class="title">
          <Label label={documents.string.ImpactAnalysis} />
        </div>
        {#if $isEditable}
          <PlainTextEditor
            value={changeControl.impact}
            placeholder={documentsRes.string.DescribeImpact}
            disabled={!$isEditable}
            on:blur={(ev) => {
              void handleFieldUpdated('impact', ev)
            }}
          />
        {:else}
          {changeControl.impact ?? '—'}
        {/if}
      </div>

      <div class="block">
        <div class="title">
          <Label label={documents.string.ImpactedDocuments} />
        </div>
        {#if $isEditable || changeControl.impactedDocuments.length > 0}
          <DocumentBoxItems
            _class={documents.class.ControlledDocument}
            items={changeControl.impactedDocuments}
            label={documents.string.ImpactedDocuments}
            readonly={!$isEditable}
            docQuery={{
              space: { $in: docSpaces },
              state: DocumentState.Effective,
              attachedTo: { $ne: $controlledDocument?.attachedTo }
            }}
            on:update={({ detail }) => updateCCField('impactedDocuments', detail)}
          />
        {:else}
          <Label label={documentsRes.string.NoDocuments} />
        {/if}
      </div>
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .root {
    padding: 1.5rem 3.25rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .title {
    font-weight: 500;
    font-size: var(--body-font-size);
    color: var(--theme-caption-color);
    user-select: none;
  }
</style>
