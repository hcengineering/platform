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
  import { Card } from '@hcengineering/card'
  import { WithLookup } from '@hcengineering/core'
  import { ShowMore } from '@hcengineering/ui'

  import ContentEditor from './ContentEditor.svelte'

  export let card: WithLookup<Card>
  export let maxHeight: string = '30rem'
  export let collapsible: boolean = true
  export let compact: boolean = false

  // Function to safely parse maxHeight with fallback
  function getMaxSize (maxHeight: string): number {
    const remValue = parseFloat(maxHeight.replace('rem', ''))
    if (isNaN(remValue) || remValue <= 0) {
      return 480
    }
    return remValue * 16
  }
</script>

<div class="content-preview" class:compact>
  <ShowMore limit={getMaxSize(maxHeight)} ignore={!collapsible}>
    <div class="content-wrapper">
      <ContentEditor object={card} readonly={true} />
    </div>
  </ShowMore>
</div>

<style lang="scss">
  .content-preview {
    width: 100%;
    color: var(--global-secondary-TextColor);
    position: relative; // Ensure proper positioning context for ShowMore button

    &.compact {
      font-size: 0.875rem;
    }
  }

  .content-wrapper {
    width: 100%;
    overflow: visible; // Changed from hidden to allow ShowMore button to be visible
    word-wrap: break-word;
    position: relative; // Additional positioning context
  }
</style>
