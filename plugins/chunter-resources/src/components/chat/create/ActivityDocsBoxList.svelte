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
  import { createEventDispatcher } from 'svelte'
  import type { Doc } from '@hcengineering/core'
  import view from '@hcengineering/view'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { ButtonKind, ButtonSize, TooltipAlignment } from '@hcengineering/ui'
  import { Button, showPopup } from '@hcengineering/ui'
  import activity, { ActivityDoc } from '@hcengineering/activity'
  import { getDocLinkTitle } from '@hcengineering/view-resources'
  import { IntlString } from '@hcengineering/platform'

  import DocChannelsPopup from './DocChannelsPopup.svelte'
  import chunter from '../../../plugin'
  import { getChannelIcon } from '../../../utils'

  export let selectedDoc: Doc | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const activityDocsQuery = createQuery()

  let activityDocs: ActivityDoc[] = []
  let documents: Doc[] = []

  activityDocsQuery.query(
    activity.mixin.ActivityDoc,
    {
      _id: {
        $nin: [
          chunter.class.ChatMessage,
          activity.class.DocUpdateMessage,
          chunter.class.Channel,
          chunter.class.DirectMessage
        ]
      }
    },
    (res) => {
      activityDocs = res
    }
  )

  async function updateDocuments (activityDocs: ActivityDoc[]) {
    documents = []
    for (const activityDoc of activityDocs) {
      // TODO: remove limit (to do this we need to configure the UI so that it doesn't load and show all the documents at once)
      const docs = await client.findAll(activityDoc._id, {}, { limit: 10 })

      documents = [...documents, ...docs]
    }
  }

  $: updateDocuments(activityDocs)

  async function openDocumentsPopup (evt: Event): Promise<void> {
    showPopup(
      DocChannelsPopup,
      {
        _class: activityDocs[0]._id,
        objects: documents,
        allowDeselect: false,
        selectedObjects: selectedDoc ? [selectedDoc] : []
      },
      evt.target as HTMLElement,
      (doc) => {
        if (doc != null) {
          dispatch('update', doc)
        }
      }
    )
  }
</script>

<Button
  icon={selectedDoc ? getChannelIcon(selectedDoc) : view.icon.Views}
  width={width ?? 'min-content'}
  {kind}
  {size}
  {justify}
  label={selectedDoc === undefined ? chunter.string.Docs : undefined}
  notSelected={selectedDoc === undefined}
  showTooltip={label ? { label, direction: labelDirection } : undefined}
  on:click={openDocumentsPopup}
>
  <svelte:fragment slot="content">
    {#if selectedDoc}
      {#await getDocLinkTitle(client, selectedDoc._id, selectedDoc._class, selectedDoc) then title}
        {title}
      {/await}
    {/if}
  </svelte:fragment>
</Button>
