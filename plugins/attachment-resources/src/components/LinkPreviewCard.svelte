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
  import presentation from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { LinkPreviewData } from '../types'
  import WebIcon from './icons/Web.svelte'

  export let value: LinkPreviewData

  const dispatch = createEventDispatcher()

  const maxLength: number = 30

  const trimName = (name: string): string => {
    if (name.length <= maxLength) return name

    const ellipsis = '...'
    const partLength = Math.floor((maxLength - ellipsis.length) / 2)
    return name.slice(0, partLength) + ellipsis + name.slice(-partLength)
  }

  let useDefaultIcon = false
</script>

<div class="flex-row-center attachment-container">
  <div class="flex-center icon image">
    {#if value.icon !== undefined && !useDefaultIcon}
      <img
        src={value.icon}
        class="link-preview-icon"
        alt="link-preview"
        on:error={() => {
          useDefaultIcon = true
        }}
      />
    {:else}
      <WebIcon size="medium" />
    {/if}
  </div>
  <div class="flex-col info-container">
    <div class="name">
      <a target="_blank" class="no-line" style:flex-shrink={0} href={value.url}>
        {trimName(value?.title ?? value.url)}
      </a>
    </div>
    <div class="info-content flex-row-center">
      <span class="actions inline-flex clear-mins gap-1">
        {#if value.description}
          {trimName(value.description)}
          <span>•</span>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
          class="remove-link"
          on:click={(ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            dispatch('remove', value)
          }}
        >
          <Label label={presentation.string.Delete} />
        </span>
      </span>
    </div>
  </div>
</div>

<style lang="scss">
  .link-preview-icon {
    max-width: 2rem;
    max-height: 2rem;
  }
  .attachment-container {
    flex-shrink: 0;
    width: auto;
    height: 3rem;
    min-width: 17.25rem;
    border-radius: 0.25rem;

    .icon {
      flex-shrink: 0;
      width: 3rem;
      height: 3rem;
      object-fit: contain;
      border: 1px solid var(--theme-button-border);
      border-radius: 0.25rem 0 0 0.25rem;
      cursor: pointer;

      &:not(.image) {
        color: var(--primary-button-color);
        background-color: var(--primary-button-default);
      }
      &.image {
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
      }
    }
    .info-container {
      padding: 0.5rem 0.75rem;
      width: 100%;
      height: 100%;
      background-color: var(--theme-button-default);
      border: 1px solid var(--theme-button-border);
      border-left: none;
      border-radius: 0 0.25rem 0.25rem 0;
    }
    .no-line:hover ~ .info-container,
    .info-container:hover {
      background-color: var(--theme-button-hovered);

      .actions {
        opacity: 1;
      }
    }
    .name {
      white-space: nowrap;
      font-size: 0.8125rem;
      color: var(--theme-caption-color);
      cursor: pointer;

      &:hover ~ .info-content .actions {
        opacity: 1;
      }
    }
    .info-content {
      white-space: nowrap;
      font-size: 0.6875rem;
      color: var(--theme-darker-color);

      .actions {
        opacity: 0;
        transition: opacity 0.1s var(--timing-main);
      }
      &:hover .actions {
        opacity: 1;
      }
    }
    .remove-link {
      color: var(--theme-error-color);
      cursor: pointer;

      &:hover {
        text-decoration-line: underline;
      }
    }

    .name:hover,
    .no-line:hover + .info-container > .name a {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
    .name:active,
    .no-line:active + .info-container > .name a {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
  }
</style>
