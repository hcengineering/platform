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
  import documents, { getDocumentName, type Document, type Project } from '@hcengineering/controlled-documents'
  import { type Ref } from '@hcengineering/core'
  import { Icon, navigate } from '@hcengineering/ui'

  import { getProjectDocumentLink } from '../../../../navigation'

  export let doc: Document
  export let project: Ref<Project>
  export let highlighted: boolean = false

  const icon = documents.icon.Document
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiNav-element root"
  on:click={() => {
    const loc = getProjectDocumentLink(doc, project)
    navigate(loc)
  }}
>
  {#if icon}
    <div class="an-element__icon">
      <Icon
        {icon}
        iconProps={{
          fill: 'currentColor'
        }}
        size={'small'}
      />
    </div>
  {/if}
  <span class="an-element__label" class:font-medium={highlighted}>
    {getDocumentName(doc)}
  </span>
</div>

<style lang="scss">
  .root {
    padding-left: 0;
  }
</style>
