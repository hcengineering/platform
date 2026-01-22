<!--
//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
-->
<script lang="ts">
  import core from '@hcengineering/core'
  import { IconWithEmoji, getClient } from '@hcengineering/presentation'
  import { Icon, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import textEditor from '@hcengineering/text-editor'
  import type { TableMetadata } from '../tableMetadata'

  export let metadata: TableMetadata

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: cardClassRef = metadata.cardClass as any
  $: cardClass = hierarchy.findClass(cardClassRef)
  $: classLabel = cardClass?.label
  $: classIcon = cardClass?.icon

  // Format query information
  $: queryInfo = (() => {
    if (metadata.documentIds !== undefined && metadata.documentIds.length > 0) {
      return `Selected documents (${metadata.documentIds.length} items)`
    } else if (metadata.query !== null && metadata.query !== undefined) {
      try {
        return JSON.stringify(metadata.query, null, 2)
      } catch {
        return String(metadata.query)
      }
    }
    return undefined
  })()

  $: originalUrlDisplay = metadata.originalUrl
    ? metadata.originalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : undefined
</script>

<div class="table-source-info">
  <div class="source-content">
    {#if originalUrlDisplay && metadata.originalUrl}
      <div class="source-row">
        <span class="source-label">
          <Label label={textEditor.string.SourceURL} />
        </span>
        <div class="source-value">
          <a href={metadata.originalUrl} target="_blank" rel="noopener noreferrer" class="link">
            {originalUrlDisplay}
          </a>
        </div>
      </div>
    {:else if cardClass !== undefined && cardClass !== null && classLabel !== undefined}
      <div class="source-row">
        <span class="source-label">
          <Label label={core.string.Class} />
        </span>
        <div class="source-value">
          {#if classIcon}
            <Icon
              icon={classIcon === view.ids.IconWithEmoji ? IconWithEmoji : classIcon}
              iconProps={classIcon === view.ids.IconWithEmoji ? { icon: cardClass.color } : {}}
              size="small"
            />
          {/if}
          <Label label={classLabel} />
        </div>
      </div>
    {/if}
    {#if queryInfo}
      <div class="source-row">
        <span class="source-label">
          <Label label={view.string.Filter} />
        </span>
        <div class="source-value query-value">
          {#if metadata.documentIds !== undefined && metadata.documentIds.length > 0}
            <span class="query-text">{queryInfo}</span>
          {:else}
            <pre class="query-json"><code>{queryInfo}</code></pre>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .table-source-info {
    margin-top: 0.5rem;
    border: 1px solid var(--theme-border);
    border-radius: 0.5rem;
    background: var(--theme-surface-01);
    overflow: hidden;
    font-size: 0.875rem;
  }

  .source-content {
    padding: 0.5rem 1rem;
  }

  .source-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .source-label {
    min-width: 5rem;
    color: var(--caption-color);
    font-weight: 500;
    flex-shrink: 0;
  }

  .source-value {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .query-value {
    flex-direction: column;
    align-items: flex-start;
  }

  .query-text {
    color: var(--theme-text-primary);
  }

  .query-json {
    margin: 0;
    padding: 0.75rem;
    background: var(--theme-surface-02);
    border: 1px solid var(--theme-border);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: var(--theme-text-primary);
    overflow-x: auto;
    max-width: 100%;
    max-height: 10rem;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;

    code {
      display: block;
      white-space: pre;
    }
  }

  .link {
    color: var(--theme-link-color);
    text-decoration: none;
    word-break: break-all;

    &:hover {
      text-decoration: underline;
    }
  }
</style>
