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
  import { createEventDispatcher } from 'svelte'
  import { ControlledDocument, DocumentState } from '@hcengineering/controlled-documents'
  import { navigate, Scroller } from '@hcengineering/ui'

  import { getDocumentLink } from '../navigation'
  import {
    $documentAllVersionsDescSorted as documentAllVersionsDescSorted,
    $controlledDocument as controlledDocument
  } from '../stores/editors/document'
  import DocumentVersionsPopupItem from './DocumentVersionsPopupItem.svelte'

  const dispatch = createEventDispatcher()
  let versionGroups: ControlledDocument[][]

  $: {
    const versions = [...$documentAllVersionsDescSorted]
    const effectiveIdx = versions.findIndex((p) => p.state === DocumentState.Effective)

    if (effectiveIdx === -1 || effectiveIdx === versions.length - 1) {
      versionGroups = [versions]
    } else {
      const current = versions.slice(0, effectiveIdx + 1)
      const archived = versions.slice(effectiveIdx + 1)

      versionGroups = [current, archived]
    }
  }

  function navigateToVersion (doc: ControlledDocument): void {
    const loc = getDocumentLink(doc)
    navigate(loc)
    dispatch('close')
  }
</script>

<div class="selectPopup dropdown">
  <div class="menu-space" />
  <Scroller>
    {#each versionGroups as group, index}
      {#if index > 0}
        <div class="menu-separator" />
      {/if}
      {#each group as version}
        <DocumentVersionsPopupItem
          doc={version}
          isCurrent={version._id === $controlledDocument?._id}
          onClick={() => {
            navigateToVersion(version)
          }}
        />
      {/each}
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .dropdown {
    min-width: 25rem;
  }
</style>
