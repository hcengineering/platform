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

  export let value: Issue
  export let shouldUseMargin: boolean = false
</script>

{#if value}
  <span class="titleLabel" class:mTitleLabelWithMargin={shouldUseMargin} title={value.title}>{value.title}</span>
{/if}

<style lang="scss">
  .titleLabel {
    flex-shrink: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    &.mTitleLabelWithMargin {
      margin-left: 0.5rem;
    }
  }
</style>
