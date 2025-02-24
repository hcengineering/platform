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
  import { Label } from '@hcengineering/ui'
  import documents, { DocumentState } from '@hcengineering/controlled-documents'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'

  import { $controlledDocument as controlledDocument } from '../../stores/editors/document'
  import DocumentHistory from '../document/DocumentHistory.svelte'
  import DocumentSignatories from '../document/DocumentSignatories.svelte'
  import plugin from '../../plugin'
  import { getDocReference } from '../../docutils'

  const client = getClient()

  let statusWMLabel: IntlString
  $: if ($controlledDocument !== null) {
    switch ($controlledDocument.state) {
      case DocumentState.Draft:
        statusWMLabel = plugin.string.Draft
        break
      case DocumentState.Deleted:
        statusWMLabel = plugin.string.Deleted
        break
      case DocumentState.Archived:
        statusWMLabel = plugin.string.Archived
        break
      case DocumentState.Obsolete:
        statusWMLabel = plugin.string.Obsolete
        break
    }
  }

  let isOrgSpace = false

  $: void client.findOne(documents.class.OrgSpace, { _id: $controlledDocument?.space }).then((res) => {
    isOrgSpace = res !== undefined
  })

  $: hasWatermark =
    $controlledDocument != null &&
    (isOrgSpace
      ? $controlledDocument.state !== DocumentState.Effective
      : ![DocumentState.Effective, DocumentState.Archived].includes($controlledDocument.state))
</script>

{#if $controlledDocument !== null}
  <div class="root only-print">
    <div class="block">
      <div class="title">
        <Label label={documents.string.Title} />
      </div>
      <div class="attribute">
        {$controlledDocument.title}
      </div>
    </div>

    <div class="block">
      <div class="title">
        <Label label={plugin.string.Reference} />
      </div>
      <div class="attribute">
        {getDocReference($controlledDocument)}
      </div>
    </div>

    <div class="block">
      <div class="title">
        <Label label={plugin.string.History} />
      </div>

      <DocumentHistory />
    </div>

    <div class="block">
      <div class="title">
        <Label label={plugin.string.Signatories} />
      </div>

      <DocumentSignatories />
    </div>

    {#if hasWatermark}
      <div class="watermark">
        <Label label={statusWMLabel} />
      </div>
    {/if}
  </div>
  <div class="pagebreak" />
{/if}

<style lang="scss">
  $font-size: 0.875rem;

  .root {
    padding: 1.5rem 2.25rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .block {
    display: flex;
    gap: 0.5rem;

    &.vertical {
      flex-direction: column;
    }
  }

  .title {
    font-weight: 500;
    font-size: $font-size;
    color: var(--theme-caption-color);
    user-select: none;
    width: 10rem;
    flex: 0 0 auto;
  }

  .attribute {
    font-size: $font-size;
  }

  .watermark {
    position: fixed;
    z-index: 9999;
    page-break-after: always;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: auto;
    height: 4rem;
    width: 100%;
    color: var(--theme-divider-color);
    font-size: 8rem;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
