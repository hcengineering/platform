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
  import { type DocumentTemplate } from '@hcengineering/controlled-documents'

  import { Label, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import ChangeDocPrefixPopup from '../popups/ChangeDocPrefixPopup.svelte'

  export let value: DocumentTemplate
  export let editable: boolean = false

  function handleClick (event: MouseEvent): void {
    if (!editable) {
      return
    }

    event?.preventDefault()
    event?.stopPropagation()

    showPopup(
      ChangeDocPrefixPopup,
      {
        object: value
      },
      eventToHTMLElement(event)
    )
  }
</script>

{#if value}
  <a
    class="flex-presenter inline-presenter noBold"
    class:no-underline={!editable}
    class:cursor-inherit={!editable}
    href={undefined}
    on:click={handleClick}
  >
    {value.docPrefix}
  </a>
{:else}
  <Label label={view.string.LabelNA} />
{/if}
