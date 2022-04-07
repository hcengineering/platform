<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
</script>

{#if value && value.labels}
  <div class="labelsPresenter">
    {#each value.labels as label}
      <div class="labelWrapper">
        <div class="label">{label}</div>
      </div>
    {/each}
  </div>
{/if}

<style lang="scss">
  .labelsPresenter {
    display: flex;
    align-items: center;
    justify-content: start;

    .labelWrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 1.5rem;
      min-width: auto;
      border: 1px solid var(--theme-table-bg-hover);
      border-radius: 2.67rem;
      margin-left: 5px;

      &:first-child {
        margin-left: 0;
      }
    }

    .label {
      padding: 0 7px;
    }
  }
</style>
