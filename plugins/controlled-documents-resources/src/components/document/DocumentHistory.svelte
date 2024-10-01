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
  import { Label, Scroller } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import documents, { type ChangeControl } from '@hcengineering/controlled-documents'

  import documentsRes from '../../plugin'
  import {
    $controlledDocument as controlledDocument,
    $documentReleasedVersions as documentReleasedVersions
  } from '../../stores/editors/document/editor'
  import { documentCompareFn, getDocumentVersionString } from '../../utils'

  const client = getClient()

  let changeControls: Record<Ref<ChangeControl>, ChangeControl> = {}
  $: if ($documentReleasedVersions.length > 0) {
    void client
      .findAll(documents.class.ChangeControl, {
        _id: { $in: $documentReleasedVersions.map((v) => v.changeControl) }
      })
      .then((res) => {
        changeControls = res.reduce<typeof changeControls>((prev, curr) => {
          prev[curr._id] = curr
          return prev
        }, {})
      })
  }

  $: orderedVersions = $documentReleasedVersions
    .filter((doc) => {
      if ($controlledDocument == null) {
        return false
      }

      return (
        doc.major < $controlledDocument.major ||
        (doc.major === $controlledDocument.major && doc.minor <= $controlledDocument.minor)
      )
    })
    .sort(documentCompareFn)

  function getDescription (cc: ChangeControl | undefined): string {
    if (cc === undefined) {
      return ''
    }

    return [cc.reason, cc.description].filter((s) => s !== '' && s !== undefined).join('\n')
  }
</script>

<Scroller>
  <div class="root">
    {#if orderedVersions.length > 0}
      <div class="flex-col list">
        {#each orderedVersions as version}
          <div class="row flex-row-top px-4">
            <div class="flex-col col">
              <div class="fs-title text-normal version">
                {getDocumentVersionString(version)}
              </div>
              {#if version.effectiveDate !== undefined}
                <div class="date">
                  {new Date(version.effectiveDate).toLocaleDateString('default', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              {/if}
            </div>
            <div class="description">
              {getDescription(changeControls[version.changeControl])}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <Label label={documentsRes.string.FirstDraftVersion} />
    {/if}
  </div>
</Scroller>

<style lang="scss">
  .root {
    padding: 1.5rem 3.25rem;

    @media print {
      padding: 0;
    }
  }

  .list {
    gap: 3rem;
  }

  .col {
    flex: 0 0 6rem;
  }

  .row {
    gap: 3rem;
    @media print {
      border-left: 2px solid var(--theme-divider-color);
    }
  }

  .version {
    line-height: 1.25rem;
  }

  .date {
    font-size: 0.6875rem;
    color: var(--theme-dark-color);
    line-height: 1rem;
  }

  .description {
    white-space: pre-wrap;
    line-height: 1.25rem;
  }
</style>
