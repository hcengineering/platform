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
  import { Label, tooltip } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { Doc } from '@hcengineering/core'
  import { getDocLinkTitle, getDocTitle, ObjectIcon } from '@hcengineering/view-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import contact from '@hcengineering/contact'

  import ActivityMessagePreview from './ActivityMessagePreview.svelte'

  export let context: DocNotifyContext
  export let object: ActivityMessage

  let title: string | undefined = undefined
  let doc: Doc | undefined = undefined

  $: object &&
    getClient()
      .findOne(object.attachedToClass, { _id: object.attachedTo, space: object.space })
      .then((res) => {
        doc = res
      })

  $: doc &&
    getDocLinkTitle(getClient(), doc._id, doc._class, doc).then((res) => {
      title = res
    })
</script>

<span class="flex-presenter flex-gap-1 font-semi-bold">
  <Label label={(object?.replies ?? 0) > 0 ? activity.string.Thread : activity.string.Message} />
  {#if title}
    <span class="lower">
      <Label label={activity.string.In} />
    </span>
    {#if doc}
      {#await getDocTitle(getClient(), doc._id, doc._class, doc) then tooltipLabel}
        <span
          class="flex-presenter flex-gap-0-5"
          use:tooltip={tooltipLabel ? { label: getEmbeddedLabel(tooltipLabel) } : undefined}
        >
          <ObjectIcon
            value={doc}
            size={getClient().getHierarchy().isDerived(doc._class, contact.class.Person) ? 'tiny' : 'small'}
          />
          {title}
        </span>
      {/await}
    {/if}
  {/if}
</span>
<span class="font-normal">
  <ActivityMessagePreview value={object} {doc} readonly type="content-only" />
</span>
