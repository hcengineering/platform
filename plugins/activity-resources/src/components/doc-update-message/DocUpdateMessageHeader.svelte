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
  import { Doc } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'
  import { AttributeModel } from '@hcengineering/view'
  import activity, { DisplayDocUpdateMessage, DocUpdateMessageViewlet } from '@hcengineering/activity'
  import { Person } from '@hcengineering/contact'

  import { LinkData, getLinkData } from '../../activityMessagesUtils'
  import ActivityDocLink from '../ActivityDocLink.svelte'
  import { getIsTextType } from '../../utils'

  export let message: DisplayDocUpdateMessage
  export let viewlet: DocUpdateMessageViewlet | undefined
  export let person: Person | undefined
  export let object: Doc | undefined
  export let parentObject: Doc | undefined
  export let attributeModel: AttributeModel | undefined = undefined
  export let hideLink = false

  const isOwn = message.objectId === message.attachedTo

  let linkData: LinkData | undefined = undefined

  $: !hideLink &&
    getLinkData(message, object, parentObject, person).then((data) => {
      linkData = data
    })

  function getTitle (attributeModel: AttributeModel): IntlString | undefined {
    const isTextType = getIsTextType(attributeModel)

    if (!isTextType) {
      return undefined
    }

    const { attributeUpdates } = message
    const added = attributeUpdates?.added ?? []
    const removed = attributeUpdates?.removed ?? []

    if (added.length > 0 && removed.length === 0) {
      return activity.string.Added
    }
    if (removed.length > 0 && added.length === 0) {
      return activity.string.Removed
    }

    return activity.string.Changed
  }
</script>

{#if viewlet?.label}
  <span class="text-sm lower"> <Label label={viewlet.label} /></span>
{:else if attributeModel}
  {@const title = getTitle(attributeModel)}
  {#if title}
    <span class="text-sm lower"><Label label={title} /></span>
    <span class="text-sm lower"> <Label label={attributeModel.label} /></span>
  {/if}
{/if}

{#if linkData}
  <ActivityDocLink
    preposition={!isOwn || message.action === 'update' ? linkData.preposition : undefined}
    object={linkData.object}
    panelComponent={linkData.panelComponent}
    title={linkData.title}
  />
{/if}

<style lang="scss">
  span {
    margin-left: 0.25rem;
    font-weight: 400;
    line-height: 1.25rem;
  }
</style>
