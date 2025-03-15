<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import card, { Card } from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import Description from './Description.svelte'
  import FilePreview from '@hcengineering/presentation/src/components/FilePreview.svelte'
  import FilePlaceholder from './FilePlaceholder.svelte'

  export let doc: Card
  export let readonly: boolean = false
  export let content: HTMLElement

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: isFile = hierarchy.isDerived(doc._class, card.types.File)
</script>

{#if isFile && Object.keys(doc.blobs ?? {}).length === 0 && !readonly}
  <FilePlaceholder {doc} />
{/if}

{#each Object.values(doc.blobs ?? {}) as blob}
  <FilePreview
    file={blob.file}
    contentType={blob.type}
    name={blob.name}
    metadata={blob.metadata}
    fit={blob.type !== 'application/pdf'}
  />
{/each}

<Description {doc} {readonly} bind:content minHeight={isFile ? '15vh' : '25vh'} />
