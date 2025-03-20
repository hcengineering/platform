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
  import diffview from '@hcengineering/diffview'
  import { MarkupNode } from '@hcengineering/text'
  import { Component } from '@hcengineering/ui'
  import type { SvelteComponent } from 'svelte'

  export let node: MarkupNode
  export let preview = false

  const is = diffview.component.Highlight

  $: language = node.attrs?.language
  $: content = node.content ?? []
  $: value = content.map((node) => node.text).join('/n')
  $: margin = preview ? '0' : null

  $: props = { value, language }
  let innerRef: SvelteComponent | undefined
</script>

{#if node}
  <pre class="proseCodeBlock" style:margin><code
      ><Component {is} {props} showLoading={false} bind:innerRef />{#if !innerRef}{value}{/if}</code
    ></pre>
{/if}
