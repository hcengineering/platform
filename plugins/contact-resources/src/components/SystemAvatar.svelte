<!--
// Copyright © 20223 Hardcore Engineering Inc.
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
  import { Icon, IconSize, resolvedLocationStore } from '@hcengineering/ui'
  import { Asset } from '@hcengineering/platform'

  export let size: IconSize
  export let variant: 'circle' | 'roundedRect' = 'roundedRect'
  export let icon: Asset | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined

  $: workspace = $resolvedLocationStore.path[1]
</script>

<div class="avatar {size} {variant}">
  <div class="text">
    {#if icon}
      <Icon {icon} {size} {iconProps} />
    {:else}
      {workspace?.toUpperCase()?.[0]}
    {/if}
  </div>
</div>

<style lang="scss">
  .avatar {
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--avatar-border-color);
    background-color: var(--avatar-bg-color);

    .text {
      font-weight: 500;
      color: var(--theme-accent-color);
    }

    &.circle {
      border-radius: 50%;
    }

    &.roundedRect {
      border-radius: 0.5rem;
    }

    &.card {
      width: 1.25rem;
      height: 1.25rem;

      .text {
        font-weight: 500;
        font-size: 0.625rem;
        letter-spacing: -0.05em;
      }

      &.roundedRect {
        border-radius: 0.25rem;
      }
    }

    &.x-small {
      width: 1.5rem;
      height: 1.5rem;

      .text {
        font-size: 0.75rem;
        letter-spacing: -0.05em;
      }
    }

    &.small {
      width: 2rem;
      height: 2rem;

      .text {
        font-size: 0.875rem;
        letter-spacing: -0.05em;
      }
    }

    &.medium {
      width: 2.5rem;
      height: 2.5rem;

      .text {
        font-size: 0.875rem;
        letter-spacing: -0.05em;
      }
    }

    &.large {
      width: 4.5rem;
      height: 4.5rem;

      .text {
        font-size: 2rem;
      }
    }

    &.x-large {
      width: 7.5rem;
      height: 7.5rem;

      .text {
        font-size: 3.5rem;
      }

      &.roundedRect {
        border-radius: 1rem;
      }
    }
  }
</style>
