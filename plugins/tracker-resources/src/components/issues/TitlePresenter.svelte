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
  import type { Issue } from '@anticrm/tracker'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'

  export let value: Issue
  export let shouldUseMargin: boolean = false
</script>

{#if value}
  <span class="root" class:with-margin={shouldUseMargin} title={value.title}>
    <span class="name">{value.title}</span>
    <ParentNamesPresenter {value} />
  </span>
{/if}

<style lang="scss">
  .root {
    display: flex;
    flex-grow: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    flex-shrink: 10;

    &.with-margin {
      margin-left: 0.5rem;
    }
  }
</style>
