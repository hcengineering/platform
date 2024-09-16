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
  export let kind: 'primary' | 'secondary' | 'simple' = 'primary'
  export let size: 'xx-small' | 'x-small' | 'small' | 'medium' = 'small'

  const maxNumber = 9
</script>

{#if kind === 'primary' && count > 0}
  <div class="notifyMarker {size} {kind}">
    {#if count > maxNumber}
      {maxNumber}+
    {:else}
      {count}
    {/if}
  </div>
{/if}

{#if kind === 'secondary'}
  <div class="notifyMarker {size} {kind}" />
{/if}

{#if kind === 'simple'}
  <div class="notifyMarker {size} {kind}" />
{/if}

<style lang="scss">
  .notifyMarker {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 50%;
    font-weight: 700;

    &.simple,
    &.primary {
      background-color: var(--global-higlight-Color);
      color: var(--global-on-accent-TextColor);
    }

    &.secondary {
      background-color: var(--global-subtle-BackgroundColor);
    }

    &.xx-small {
      width: 0.5rem;
      height: 0.5rem;
    }

    &.x-small {
      width: 0.75rem;
      height: 0.75rem;
    }

    &.small {
      width: 1rem;
      height: 1rem;
      font-size: 0.5rem;
    }

    &.medium {
      width: 1.25rem;
      height: 1.25rem;
      font-size: 0.625rem;
    }
  }
</style>
