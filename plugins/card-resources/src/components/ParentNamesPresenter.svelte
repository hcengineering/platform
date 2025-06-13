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
  import { concatLink } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { NavLink } from '@hcengineering/presentation'
  import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'
  import { cardId, Card, ParentInfo } from '@hcengineering/card'

  export let value: Card | undefined

  export let maxWidth = ''

  const MIN_WIDTH = 2 // rem

  function getHref (parentInfo: ParentInfo) {
    const loc = getCurrentLocation()
    loc.path[2] = cardId
    loc.path[3] = parentInfo._id
    loc.path.length = 4
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    return concatLink(frontUrl, locationToUrl(loc))
  }
</script>

{#if value && Array.isArray(value.parentInfo) && (value.parentInfo.length > 0 || $$slots.default)}
  <div
    class="cards-container cropped-text-presenters"
    style:max-width={maxWidth}
    style:--cards-container-card-min-width={`${MIN_WIDTH}rem`}
    style:--cards-container-parents={value.parentInfo.length}
  >
    {#each value.parentInfo as parentInfo}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <NavLink
        href={getHref(parentInfo)}
        title={parentInfo.title}
        shrink={parentInfo.title.length > 100 ? 2 : 1}
        colorInherit
      >
        {parentInfo.title}
      </NavLink>
      <span class="separator">›</span>
    {/each}
    <slot />
  </div>
{:else if $$slots.default}
  <slot />
{/if}

<style lang="scss">
  .cards-container {
    display: inline-flex;
    flex-shrink: 1;
    margin-left: 0;
    min-width: 0;
    min-width: calc(
      (var(--cards-container-card-min-width, 2rem) + 1.26rem) * var(--cards-container-parents, 1) +
        var(--cards-container-card-min-width, 2rem)
    );
    color: var(--theme-darker-color);

    .separator {
      flex-shrink: 0;
      padding: 0 0.5rem;
      color: var(--theme-content-color);
    }
    :global(a:hover) {
      color: var(--theme-caption-color);
      // text-decoration: underline;
    }
    :global(a),
    :global(span:not(.separator)) {
      color: var(--theme-content-color);
    }
    :global(:is(span:not(.separator), a):not(:empty)) {
      min-width: var(--cards-container-card-min-width, 2rem);
    }
  }
</style>
