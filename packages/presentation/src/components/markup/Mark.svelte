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
  import { getMetadata } from '@hcengineering/platform'
  import { MarkupMark, MarkupMarkType } from '@hcengineering/text'
  import uiPlugin, { navigate, parseLocation } from '@hcengineering/ui'

  import presentation from '../../plugin'

  export let mark: MarkupMark

  function handleLink (e: MouseEvent): void {
    try {
      const href = mark.attrs.href
      if (href != null && href !== '') {
        const url = new URL(href)
        const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin

        if (url.origin === frontUrl) {
          const loc = parseLocation(url)
          const routes = getMetadata(uiPlugin.metadata.Routes)
          const app = routes?.get(loc.path[0])

          if (app !== undefined) {
            e.preventDefault()
            e.stopPropagation()
            navigate(loc)
          }
        }
      }
    } catch (err) {
      console.error('Failed to handle link', mark, err)
    }
  }
</script>

{#if mark}
  {@const attrs = mark.attrs ?? {}}

  {#if mark.type === MarkupMarkType.bold}
    <strong><slot /></strong>
  {:else if mark.type === MarkupMarkType.code}
    <code class="proseCode"><slot /></code>
  {:else if mark.type === MarkupMarkType.em}
    <em><slot /></em>
  {:else if mark.type === MarkupMarkType.link}
    <a href={attrs.href} target={attrs.target} on:click|stopPropagation={handleLink} on:contextmenu|stopPropagation>
      <slot />
    </a>
  {:else if mark.type === MarkupMarkType.strike}
    <s><slot /></s>
  {:else if mark.type === MarkupMarkType.underline}
    <u><slot /></u>
  {:else}
    unknown mark: "{mark.type}"
    <slot />
  {/if}
{/if}
