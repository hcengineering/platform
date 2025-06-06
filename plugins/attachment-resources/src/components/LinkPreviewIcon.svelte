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
  import WebIcon from './icons/Web.svelte'

  export let src: string | undefined = undefined
  export let size: 'small' | 'large' = 'small'

  let useDefaultIcon = false
</script>

{#if src && !useDefaultIcon}
  <img
    {src}
    class="link-preview__icon {size}"
    alt="link-preview-icon"
    on:error={() => {
      useDefaultIcon = true
    }}
  />
{:else}
  <WebIcon {size} />
{/if}

<style lang="scss">
  .link-preview__icon {
    &.small {
      width: 1rem;
      height: 1rem;
    }
    &.large {
      width: 2.5rem;
      height: 2.5rem;
    }
  }
</style>
