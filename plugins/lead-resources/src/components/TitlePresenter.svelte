<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { WithLookup } from '@hcengineering/core'
  import { Lead } from '@hcengineering/lead'

  export let value: WithLookup<Lead>
  export let shouldUseMargin: boolean = false
  export let kind: 'list' | undefined = undefined
  export let maxWidth = '100%'
</script>

{#if value}
  <span
    class="name overflow-label select-text"
    class:with-margin={shouldUseMargin}
    class:list={kind === 'list'}
    style:max-width={'100%'}
  >
    {value.title}
  </span>
{/if}

<style lang="scss">
  .name {
    flex-shrink: 1;
    min-width: 1rem;

    &.list {
      color: var(--theme-caption-color);
    }
    &:hover {
      text-decoration: underline;
    }
    &:active {
      color: var(--theme-content-color);
    }
  }

  .with-margin {
    margin-left: 0.5rem;
  }
</style>
