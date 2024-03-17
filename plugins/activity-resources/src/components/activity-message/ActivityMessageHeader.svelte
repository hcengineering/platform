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
  import { ActivityMessage } from '@hcengineering/activity'
  import { Person } from '@hcengineering/contact'
  import { Doc } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'

  import { LinkData, getLinkData } from '../../activityMessagesUtils'
  import ActivityDocLink from '../ActivityDocLink.svelte'
  import notification from '../../plugin'

  export let message: ActivityMessage
  export let person: Person | undefined
  export let object: Doc | undefined
  export let parentObject: Doc | undefined
  export let label: IntlString | undefined = undefined
  export let hideLink = false
  export let isEdited: boolean = false

  let linkData: LinkData | undefined = undefined

  $: !hideLink &&
    getLinkData(message, object, parentObject, person).then((data) => {
      linkData = data
    })
</script>

<span class="text-sm lower">
  {#if label}
    <Label {label} />
  {/if}
</span>

{#if linkData}
  <ActivityDocLink
    preposition={linkData.preposition}
    title={linkData.title}
    object={linkData.object}
    panelComponent={linkData.panelComponent}
  />
{/if}

{#if isEdited}
  <span class="text-sm lower"><Label label={notification.string.Edited} /></span>
{/if}

<style lang="scss">
  span {
    margin-left: 0.25rem;
    font-weight: 400;
    line-height: 1.25rem;
  }
</style>
