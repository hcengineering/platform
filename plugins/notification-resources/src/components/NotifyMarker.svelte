<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  export let count: number = 0

  const maxNumber = 9
</script>

{#if count > 0}
  <div class="notifyMarker">
    {#if count > maxNumber}
      {maxNumber}+
    {:else}
      {count}
    {/if}
  </div>
{/if}

<style lang="scss">
  .notifyMarker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: var(--highlight-red);
    font-size: 0.5rem;
    font-weight: 700;
    color: var(--white-color);
  }
</style>
