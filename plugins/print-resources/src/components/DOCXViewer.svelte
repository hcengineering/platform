<!--
// Copyright © 2024 Hardcore Engineering Inc.
//
-->

<script lang="ts">
  import { Analytics } from '@hcengineering/analytics'
  import { type Blob, type BlobMetadata, type Ref } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { getFileUrl } from '@hcengineering/presentation'
  import print, { convertForPreview, type ConvertedPreview } from '@hcengineering/print'
  import { Button, EmbeddedHTML, EmbeddedPDF, Label, Spinner, themeStore } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  export let value: Ref<Blob>
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined

  let isLoading = true
  let failed = false
  let convertedFile: ConvertedPreview | undefined
  let request: AbortController | undefined

  const token = getMetadata(presentation.metadata.Token) ?? ''

  async function loadPreview (file: Ref<Blob> | undefined): Promise<void> {
    request?.abort()
    const controller = new AbortController()
    request = controller
    isLoading = true
    failed = false
    convertedFile = undefined

    try {
      if (file === undefined) {
        throw new Error('Missing document')
      }
      const result = await convertForPreview(file, token, controller.signal)
      if (!controller.signal.aborted && file === value) {
        convertedFile = result
      }
    } catch (err) {
      if (!controller.signal.aborted && file === value) {
        failed = true
        Analytics.handleError(err)
      }
    } finally {
      if (!controller.signal.aborted && file === value) {
        isLoading = false
      }
    }
  }

  $: void loadPreview(value)

  onDestroy(() => {
    request?.abort()
  })

  $: previewName = convertedFile?.contentType === 'application/pdf' ? name.replace(/\.docx$/i, '') + '.pdf' : name
  $: src = convertedFile === undefined ? '' : getFileUrl(convertedFile.id as Ref<Blob>, previewName)
  $: originalSrc = value === undefined ? '' : getFileUrl(value, name)

  $: colors = $themeStore.dark
    ? `
    --theme-text-primary-color: rgba(255, 255, 255, .8);
    --theme-link-color: #377AE6;
    --button-border-hover: #45484e;
    --text-editor-table-header-color: rgba(255, 255, 255, 0.06);
    --scrollbar-bar-color: #35354a;
    --scrollbar-bar-hover: #8a8aa5;
  `
    : `
    --theme-text-primary-color: rgba(0, 0, 0, .8);
    --theme-link-color: #377AE6;
    --button-border-hover: #c9cbcd;
    --text-editor-table-header-color: rgba(0, 0, 0, 0.06);
    --scrollbar-bar-color: #e0e0e0;
    --scrollbar-bar-hover: #90959d;
  `

  $: css = `
    * {
      box-sizing: border-box;
      touch-action: manipulation;
      scrollbar-width: none;
      --body-font-size: .875rem;
      --status-bar-height: 36px;
      --panel-aside-width: 25rem; // 20rem;
      --font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
      --mono-font: 'IBM Plex Mono', monospace;
      --timing-shadow: cubic-bezier(0,.65,.35,1);
      --timing-main: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      --timing-rotate: cubic-bezier(.28,1.92,.39,.56);
      --timing-clock: cubic-bezier(.35,2.1,.79,.71);
    }
    *::after,
    *::before { box-sizing: border-box; }

    body {
      ${colors}

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;

      font-family: var(--font-family);
      font-style: normal;
      font-weight: 400;
      font-size: var(--body-font-size);
      color: var(--theme-text-primary-color);

      margin: 0 auto;
      max-width: 1200px;

      @media not print {
        padding: .75rem 1.5rem;
      }
    }

    @media only screen and (max-width: 600px) {
      html {
        font-size: 14px;
      }

      body {
        margin: 0;
      }
    }

    @media only screen and (min-width: 600px) and (max-width: 1240px) {
      html {
        font-size: 15px;
      }

      body {
        margin: 0 1.5rem;
      }
    }

    h1,
    h2,
    h3,
    b {
      font-weight: 600;
    }

    h1,
    h2,
    h3 {
      &:first-child {
        margin-top: 0;
      }
    }

    h1 {
      font-size: 1.75rem;
      line-height: 150%;
      margin-top: 2.75rem;
      margin-bottom: 0.25rem;
    }

    h2 {
      font-size: 1.375rem;
      line-height: 150%;
      margin-top: 2.25rem;
      margin-bottom: 0.25rem;
    }

    h3 {
      font-size: 1.125rem;
      line-height: 150%;
      margin-top: 1.5rem;
      margin-bottom: 0.25rem;
    }

    p {
      margin-block-start: 0.5rem;
      user-select: text;
      
      a {
        word-break: break-all;
        word-break: break-word;
        hyphens: auto;
        color: var(--theme-link-color);

        &:hover,
        &:active,
        &:visited { color: var(--theme-link-color); }  
      }
    }

    >*+* {
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

    img {
      max-width: 100%;
    }

    ul,
    ol {
      margin-right: .25rem;
      margin-left: .75rem;
      padding: 0;
    }

    li {
      margin-left: 0.75rem;
      padding-left: 0.375rem;
    }

    li p {
      margin: 0;
    }

    ol ol { list-style: lower-alpha; }
    ol ol ol { list-style: lower-roman; }
    ol ol ol ol { list-style: decimal; }
    ol ol ol ol ol { list-style: lower-alpha; }
    ol ol ol ol ol ol { list-style: lower-roman; }
    ol ol ol ol ol ol ol { list-style: decimal; }

    blockquote {
      margin-inline: 1px 0;
      padding-left: 1.5em;
      padding-right: 1.5em;
      font-style: italic;
      position: relative;

      border-left: 3px solid var(--theme-text-primary-color);
    }

    table {
      font-size: var(--body-font-size);
      border-collapse: collapse;
      table-layout: fixed;
      position: relative;
      width: 100%;
      margin: 0;

      td,
      th {
        min-width: 1rem;
        height: 2rem;
        border: 1px solid var(--button-border-hover);
        padding: .25rem .5rem;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;

        > * {
          margin-bottom: 0;
        }
      }

      th {
        text-align: left;
        background-color: var(--text-editor-table-header-color);
      }

      p {
        margin: 0;
      }
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar:horizontal { height: 6px; }
    ::-webkit-scrollbar-track { margin: 6px; }
    ::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-bar-color);
      border-radius: .25rem;
    }
    ::-webkit-scrollbar-thumb:hover { background-color: var(--scrollbar-bar-hover); }
    ::-webkit-scrollbar-corner {
      background-color: var(--scrollbar-bar-color);
      border-radius: .25rem;
    }

    cmark {
      border-top: 1px solid lightblue;
      border-bottom: 1px solid lightblue;
      border-radius: 2px;
    }
  `
</script>

{#if isLoading}
  <div class="centered">
    <Spinner size="medium" />
  </div>
{:else if failed}
  <div class="centered failed">
    <Label label={presentation.string.FailedToPreview} />
    <div class="flex-row-center flex-gap-2">
      <Button label={print.string.Retry} on:click={() => loadPreview(value)} />
      {#if originalSrc}
        <a href={originalSrc} download={name}>
          <Label label={presentation.string.DownloadOriginal} />
        </a>
      {/if}
    </div>
  </div>
{:else if src}
  {#key src}
    {#if convertedFile?.contentType === 'application/pdf'}
      <EmbeddedPDF {src} name={previewName} />
    {:else}
      <EmbeddedHTML {src} {name} {css} />
    {/if}
  {/key}
{/if}

<style lang="scss">
  .centered {
    flex-grow: 1;
    width: 100%;
    min-height: 20rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .failed {
    flex-direction: column;
    gap: 1rem;
  }
</style>
