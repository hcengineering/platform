<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Applet } from '@hcengineering/communication'
  import { createEventDispatcher } from 'svelte'
  import { Label } from '@hcengineering/ui'
  import presentation from '@hcengineering/presentation'

  import { PollConfig } from '../../poll'

  export let applet: Applet
  export let params: PollConfig
  export let editing: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="flex-row-center attachment-container">
  <div class="flex-center icon">Poll</div>

  <div class="flex-col info-container">
    <div class="name overflow-label">
      {params.question}
    </div>
    <div class="info-content flex-row-center">
      <span class="actions inline-flex clear-mins flex-gap-1">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if !editing}
          <span
            class="edit-link"
            on:click={(ev) => {
              ev.stopPropagation()
              ev.preventDefault()
              dispatch('change')
            }}
          >
            <Label label={presentation.string.Edit} />
          </span>
          <span>•</span>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
          class="remove-link"
          on:click={(ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            dispatch('delete')
          }}
        >
          <Label label={presentation.string.Delete} />
        </span>
      </span>
    </div>
  </div>
</div>

<style lang="scss">
  .attachment-container {
    flex-shrink: 0;
    height: 3rem;
    min-width: 17.25rem;
    max-width: 17.25rem;
    width: 17.25rem;
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
    }
    .info-content {
      white-space: nowrap;
      font-size: 0.6875rem;
      color: var(--theme-darker-color);

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

    .edit-link {
      color: var(--theme-darker-color);
      cursor: pointer;
      font-weight: 500;

      &:hover {
        text-decoration-line: underline;
        color: var(--theme-dark-color);
      }
    }
  }
</style>
