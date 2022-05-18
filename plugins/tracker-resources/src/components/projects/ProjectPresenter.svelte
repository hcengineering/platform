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
  import { WithLookup } from '@anticrm/core'
  import { Project } from '@anticrm/tracker'

  export let value: WithLookup<Project>
</script>

{#if value}
  <div class="flex-presenter projectPresenterRoot">
    <span title={value.label} class="projectLabel">{value.label}</span>
  </div>
{/if}

<style lang="scss">
  .projectPresenterRoot {
    max-width: 5rem;
  }

  .projectLabel {
    display: block;
    min-width: 0;
    font-weight: 500;
    text-align: left;
    color: var(--theme-caption-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
