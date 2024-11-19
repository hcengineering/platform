<!--
//
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
//
-->
<script lang="ts">
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'
  import { ObjectPresenterType } from '@hcengineering/view'
  import { Icon, Label } from '@hcengineering/ui'
  import survey, { Survey, Poll } from '@hcengineering/survey'
  import { hasText } from '../utils'

  export let value: Survey | Poll | undefined | null
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let colorInherit: boolean = false
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined
  export let type: ObjectPresenterType = 'link'
  export let overflowLabel = true
  export let maxWidth: string = ''
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} {accent} {noUnderline} {colorInherit} onClick={onEdit} />
  {:else if type === 'link'}
    <DocNavLink object={value} onClick={onEdit} {disabled} {noUnderline} {colorInherit} {accent} noOverflow>
      <div class="flex-presenter" style:max-width={maxWidth}>
        <div class="icon">
          <Icon icon={value._class === survey.class.Survey ? survey.icon.Survey : survey.icon.Poll} size={'small'} />
        </div>
        <span class="ap-label" class:overflow-label={overflowLabel} class:colorInherit class:fs-bold={accent}>
          {#if hasText(value.name)}
            {value.name}
          {:else}
            <Label label={survey.string.NoName} />
          {/if}
        </span>
      </div>
    </DocNavLink>
  {:else if type === 'text'}
    <span class:overflow-label={overflowLabel}>
      {#if hasText(value.name)}
        {value.name}
      {:else}
        <Label label={survey.string.NoName} />
      {/if}
    </span>
  {/if}
{/if}
