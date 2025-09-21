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
  export let kind: 'primary' | 'simple' = 'primary'
  export let size: 'xx-small' | 'x-small' | 'small' | 'medium' = 'small'
</script>

{#if kind === 'primary' && count > 0}
  <div class="notifyMarker {size} {kind}">
    {count}
  </div>
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
    border-radius: 0.5rem;
    font-weight: 500;
    padding: 0 0.25rem;

    &.simple,
    &.primary {
      background-color: var(--global-higlight-Color);
      color: var(--global-on-accent-TextColor);
    }

    &.xx-small {
      min-width: 0.5rem;
      height: 0.5rem;
    }

    &.x-small {
      min-width: 0.75rem;
      height: 0.75rem;
    }

    &.small {
      min-width: 1rem;
      height: 1rem;
      font-size: 0.5rem;
    }

    &.medium {
      min-width: 1.25rem;
      height: 1.25rem;
      font-size: 0.625rem;
    }
  }
</style>
