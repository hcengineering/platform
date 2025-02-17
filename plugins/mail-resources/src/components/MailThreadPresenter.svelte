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
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
-->

<script lang="ts">
  import { MailThread } from '@hcengineering/mail'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { tooltip } from '@hcengineering/ui'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'

  export let value: MailThread | undefined
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined

  const delimiter = ' — '

  function isNotEmpty (str: string): boolean {
    return str !== undefined && str !== null && str.trim().length > 0
  }
</script>

{#if value}
  {#if inline}
    <ObjectMention title={value?.subject} object={value} {disabled} {accent} {noUnderline} />
  {:else}
    <DocNavLink object={value} {disabled} {accent} {noUnderline} {onClick}>
      <div class="flex-presenter" use:tooltip={{ label: getEmbeddedLabel(value.subject) }}>
        <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {value.subject ?? value.preview}
        </span>
        {#if isNotEmpty(value.subject) && isNotEmpty(value.preview)}
          <span class="delimiter">{delimiter}</span>
          <span class="secondary-textColor overflow-label">
            {value.preview}
          </span>
        {/if}
      </div>
    </DocNavLink>
  {/if}
{/if}

<style lang="scss">
  .delimiter {
    white-space: pre;
  }
</style>
