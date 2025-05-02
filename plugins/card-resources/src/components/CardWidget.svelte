<!--
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
-->
<script lang="ts">
  import { closeWidget, WidgetState } from '@hcengineering/workbench-resources'
  import { Widget } from '@hcengineering/workbench'
  import { createQuery, createNotificationContextsQuery } from '@hcengineering/presentation'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { createEventDispatcher } from 'svelte'
  import { Card } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { Button, Header, IconClose } from '@hcengineering/ui'

  import EditCardTableOfContents from './EditCardTableOfContents.svelte'
  import card from '../plugin'
  import { CardWidgetData } from '../utils'
  import CardPresenter from './CardPresenter.svelte'

  export let widget: Widget | undefined
  export let widgetState: WidgetState | undefined
  export let height: string
  export let width: string

  const query = createQuery()
  const contextsQuery = createNotificationContextsQuery()
  const dispatch = createEventDispatcher()

  let data: CardWidgetData | undefined = undefined

  let doc: Card | undefined = undefined
  let context: NotificationContext | undefined = undefined
  let isContextLoaded = false

  $: data = widgetState?.data as CardWidgetData

  $: if (widget === undefined || data?._id === undefined) {
    closeWidget(card.ids.CardWidget as Ref<Widget>)
  }

  $: data._id &&
    query.query(
      card.class.Card,
      { _id: data._id },
      (res) => {
        if (res.length === 0) {
          closeWidget(card.ids.CardWidget as Ref<Widget>)
        } else {
          doc = res[0]
        }
      },
      { limit: 1 }
    )

  $: data._id &&
    contextsQuery.query({ card: data._id, limit: 1 }, (res) => {
      context = res.getResult()[0]
      isContextLoaded = true
    })
</script>

{#if widget && data?._id}
  <div class="card-widget" style:width style:height>
    <Header type={'type-panel'} noPrint adaptive="disabled">
      <svelte:fragment slot="beforeTitle">
        <Button
          id={'btnPClose'}
          focusIndex={10001}
          icon={IconClose}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          noPrint
          on:click={() => {
            dispatch('close')
          }}
        />
      </svelte:fragment>
      <CardPresenter value={doc} noUnderline />
    </Header>
    {#if doc}
      <EditCardTableOfContents {doc} {context} {isContextLoaded} readonly={false} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .card-widget {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
</style>
