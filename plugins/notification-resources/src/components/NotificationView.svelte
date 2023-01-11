<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { TxViewlet } from '@hcengineering/activity'
  import { ActivityKey, DisplayTx, newDisplayTx, TxView } from '@hcengineering/activity-resources'
  import core, { Doc, TxCUD, TxProcessor, WithLookup, Ref, Class } from '@hcengineering/core'
  import { Notification, NotificationStatus } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Component, getPlatformColor, IconBack, IconCheck, IconDelete } from '@hcengineering/ui'
  import type { AnyComponent } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectPreview } from '@hcengineering/view-resources'
  import plugin from '../plugin'

  export let notification: WithLookup<Notification>
  export let viewlets: Map<ActivityKey, TxViewlet>
  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getDisplayTx (notification: WithLookup<Notification>): DisplayTx | undefined {
    let tx = notification.$lookup?.tx
    if (tx) {
      if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
        tx = TxProcessor.extractTx(tx) as TxCUD<Doc>
      }
      return newDisplayTx(tx, hierarchy)
    }
  }

  async function changeState (notification: Notification, status: NotificationStatus): Promise<void> {
    if (notification.status === status) return
    await client.updateDoc(notification._class, notification.space, notification._id, {
      status
    })
  }

  $: displayTx = getDisplayTx(notification)

  let presenter: AnyComponent | undefined
  let doc: Doc | undefined
  let visible: boolean = false
  async function updatePreviewPresenter (ref?: Ref<Class<Doc>>): Promise<void> {
    presenter = ref !== undefined ? await getObjectPreview(client, ref) : undefined
  }
  $: if (displayTx) updatePreviewPresenter(displayTx.tx.objectClass)
  $: if (presenter !== undefined && displayTx) {
    client.findOne(displayTx.tx.objectClass, { _id: displayTx.tx.objectId }).then((res) => (doc = res))
  }
</script>

{#if displayTx}
  {@const isNew = notification.status !== NotificationStatus.Read}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="content {isNew ? 'new' : 'readed'} with-document"
    class:visible
    style:--color={isNew ? getPlatformColor(11) : '#555555'}
    on:click|preventDefault|stopPropagation={() => {
      changeState(notification, NotificationStatus.Read)
      visible = !visible
    }}
  >
    <div class="subheader">
      <div class="flex-grow">
        <Component
          is={view.component.ObjectPresenter}
          props={{
            objectId: displayTx.tx.objectId,
            _class: displayTx.tx.objectClass,
            value: displayTx.doc,
            inline: true
          }}
        />
      </div>
      <div class="buttons-group xsmall-gap">
        <Button
          icon={isNew ? IconCheck : IconBack}
          iconProps={!isNew ? { kind: 'curve' } : {}}
          kind={'transparent'}
          showTooltip={{ label: plugin.string.MarkAsRead }}
          size={'medium'}
          on:click={() => {
            if (!isNew && visible) visible = false
            changeState(notification, isNew ? NotificationStatus.Read : NotificationStatus.Notified)
          }}
        />
        <Button
          icon={IconDelete}
          kind={'transparent'}
          showTooltip={{ label: plugin.string.Remove }}
          size={'medium'}
          on:click={() => {
            client.remove(notification)
          }}
        />
      </div>
    </div>
    <TxView tx={displayTx} {viewlets} showIcon={false} contentHidden={!visible} />
    {#if presenter && doc}
      <div class="document-preview">
        <Component is={presenter} props={{ object: doc }} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .content {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
    min-height: 0;
    border: 1px solid var(--button-border-color);
    border-radius: 0.75rem;
    transition-property: border-color, background-color, height;
    transition-duration: 0.3s, 0.15s, 0.15s;
    transition-timing-function: ease-in-out;

    &:not(:last-child) {
      margin-bottom: 0.75rem;
    }
    &.new {
      background-color: var(--popup-bg-hover);
    }
    &.readed {
      background-color: var(--body-accent);
    }
    &:hover {
      border-color: var(--button-border-hover);
    }
    &.with-document {
      cursor: pointer;

      &::before {
        content: '';
        position: absolute;
        bottom: -0.25rem;
        left: 1rem;
        right: 1rem;
        width: calc(100% - 2rem);
        height: 0.75rem;
        background-color: var(--body-accent);
        border: 1px solid var(--divider-color);
        border-radius: 0.5rem;
        z-index: -1;
        transition: bottom 0.15s ease-in-out;
        box-shadow: var(--primary-shadow);
      }
      &:hover::before {
        bottom: -0.4rem;
      }
      &.visible::before {
        bottom: 0.25rem;
      }
    }

    .subheader {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 0 0.5rem 1.75rem;
      margin-bottom: 0.5rem;
      min-height: 0;
      border-bottom: 1px solid var(--divider-color);

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0.5rem;
        width: 0.5rem;
        height: 0.5rem;
        background-color: var(--color);
        transform: translateY(calc(-50% - 0.25rem));
        border-radius: 50%;
      }
    }
    .document-preview {
      overflow: hidden;
      visibility: hidden;
      margin-top: -0.5rem;
      padding: 0;
      max-height: 0;
      background-color: var(--body-color);
      border: 1px solid var(--divider-color);
      border-radius: 0.5rem;
      opacity: 0;
      transition-property: margin-top, max-height, opacity;
      transition-timing-function: ease-in-out;
      transition-duration: 0.15s;
    }
    &.visible .document-preview {
      visibility: visible;
      margin-top: 0.5rem;
      padding: 0.75rem 1rem;
      max-height: max-content;
      opacity: 1;
    }
  }
</style>
