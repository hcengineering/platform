<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Html, Loading, themeStore } from '@hcengineering/ui'
  import { DiffFile, DiffLine, DiffLineType, DiffViewMode } from '@hcengineering/diffview'

  import { DiffLineRenderResult, RenderOptions, renderHunk } from '../highlight'

  export let file: DiffFile
  export let mode: DiffViewMode
  export let tabSize = 4

  const options: RenderOptions = {
    syntaxHighlight: {
      language: file.language ?? ''
    }
  }

  function codeLineClass (line: DiffLine): string {
    return `line-${line.type}`
  }

  $: highlighted = file.hunks.map((hunk) => renderHunk(hunk, options))

  function prepareLinesForUnifiedView (lines: DiffLineRenderResult[]): DiffLine[] {
    return lines.map(({ before, after }) => (after.type !== DiffLineType.EMPTY ? after : before))
  }

  function prepareLinesForSplitView (lines: DiffLineRenderResult[]): DiffLineRenderResult[] {
    const before: DiffLine[] = []
    const after: DiffLine[] = []

    let moved: DiffLine[] = []

    for (const line of lines) {
      before.push(line.before)
      if (line.after.type === 'insert') {
        after.push(line.after)
      } else if (line.after.type === 'context') {
        after.push(...moved)
        moved = []
        after.push(line.after)
      } else {
        moved.push(line.after)
      }
    }
    after.push(...moved)

    const result: DiffLineRenderResult[] = []
    while (before.length > 0 && after.length > 0) {
      const beforeLine = before.shift()
      const afterLine = after.shift()
      if (beforeLine && afterLine) {
        result.push({ before: beforeLine, after: afterLine })
      }
    }

    return result
  }
</script>

<div
  class="highlight-container"
  class:highlight-container-dark={$themeStore.dark}
  class:highlight-container-light={!$themeStore.dark}
>
  {#if highlighted === undefined}
    <Loading />
  {:else}
    <table class="diff-table diff-table-{mode} tab-size" data-tab-size={tabSize}>
      <colgroup>
        {#if mode === 'unified'}
          <col class="num-col" />
          <col class="num-col" />
          <col class="code-col" />
        {:else}
          <col class="num-col" />
          <col class="code-col" />
          <col class="num-col" />
          <col class="code-col" />
        {/if}
      </colgroup>
      <tbody>
        {#each highlighted as hhunk}
          {@const hunk = hhunk.hunk}

          {#if mode === 'unified'}
            {@const lines = prepareLinesForUnifiedView(hhunk.lines)}

            <tr>
              <td class="num-line line-header" />
              <td class="num-line line-header" />
              <td class="code-line line-header">{hunk.header}</td>
            </tr>
            {#each lines as line}
              {@const lineClass = codeLineClass(line)}
              <tr>
                <td class="num-line {lineClass}">{line.oldNumber ?? ''}</td>
                <td class="num-line {lineClass}">{line.newNumber ?? ''}</td>
                <td class="code-line select-text {lineClass}" data-code-marker={line.prefix}>
                  <Html value={line.content} />
                </td>
              </tr>
            {/each}
          {:else}
            {@const lines = prepareLinesForSplitView(hhunk.lines)}

            <tr>
              <td class="num-line line-header" />
              <td class="code-line line-header" colspan="3">{hunk.header}</td>
            </tr>
            {#each lines as line}
              {@const before = line.before}
              {@const after = line.after}

              {@const beforeLineClass = codeLineClass(before)}
              {@const afterLineClass = codeLineClass(after)}
              <tr>
                <td class="num-line {beforeLineClass}">{before.oldNumber ?? ''}</td>
                <td class="code-line select-text {beforeLineClass}" data-code-marker={before.prefix}>
                  <Html value={before.content} />
                </td>
                <td class="num-line {afterLineClass}">{after.newNumber ?? ''}</td>
                <td class="code-line select-text {afterLineClass}" data-code-marker={after.prefix}>
                  <Html value={after.content} />
                </td>
              </tr>
            {/each}
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style lang="scss">
  .highlight-container-light :global {
    @import './theme/github.scss';
  }

  .highlight-container-dark :global {
    @import './theme/github-dark.scss';
  }

  .diff-table {
    font-family: var(--mono-font);
    font-size: 0.8125rem;
    width: 100%;

    &.tab-size {
      tab-size: attr(data-tab-size);
    }

    &.diff-table-split {
      table-layout: fixed;
    }
  }

  .diff-table-split .code-line + .num-line {
    border-left: 1px solid var(--theme-divider-color);
  }

  td {
    &.code-line {
      border-left: 1px solid var(--theme-divider-color);
    }

    &.line-header {
      background-color: var(--theme-diffview-block-header-color);
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
      white-space: pre-wrap;
    }

    &.line-insert {
      background-color: var(--theme-diffview-insert-line-color);
    }

    &.line-delete {
      background-color: var(--theme-diffview-delete-line-color);
    }

    &.line-empty {
      background-color: var(--theme-diffview-empty-line-color);
    }
  }

  .num-col {
    width: 1px;
    min-width: 3.5rem;
  }

  .num-line {
    padding: 0 0.5rem;
    text-align: right;
    vertical-align: top;
    text-overflow: ellipsis;
    white-space: nowrap;
    position: relative;
  }

  .code-line {
    position: relative;
    color: var(--theme-diffview-line-color);
    padding: 0 1.5rem;
    vertical-align: top;
    white-space: pre-wrap;
    word-wrap: anywhere;
  }

  .code-line::before {
    content: attr(data-code-marker);
    position: absolute;
    left: 0.5rem;
  }
</style>
