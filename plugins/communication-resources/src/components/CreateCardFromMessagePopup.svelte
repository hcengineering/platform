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
  import cardPlugin, { Card, MasterTag } from '@hcengineering/card'
  import { Class, ClassifierKind, Doc, Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { DropdownIntlItem, Label, Modal, ModernEditbox, NestedDropdown } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Message } from '@hcengineering/communication-types'
  import { markupToText } from '@hcengineering/text'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import { toMarkup } from '../utils'
  import { attachCardToMessage } from '../actions'
  import MessagePresenter from './message/MessagePresenter.svelte'
  import { threadCreateMessageStore } from '../stores'
  import communication from '../plugin'

  export let message: Message
  export let card: Card

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const dispatch = createEventDispatcher()

  $: _message = $threadCreateMessageStore ?? message
  let title = getDefaultTitle(message)
  let selectedType: Ref<MasterTag> | undefined
  let inProgress = false

  function getDefaultTitle (message: Message): string {
    const markup = toMarkup(message.content)
    const messageText = markupToText(markup).trim()

    return messageText.length > 0 ? messageText : ''
  }

  async function attachCard (): Promise<void> {
    if (selectedType === undefined || title.trim() === '') return
    try {
      inProgress = true
      await attachCardToMessage(_message, card, title, selectedType)
      dispatch('close')
    } finally {
      inProgress = false
    }
  }

  function filterClasses (): [DropdownIntlItem, DropdownIntlItem[]][] {
    const descendants = hierarchy.getDescendants(cardPlugin.class.Card).filter((p) => p !== cardPlugin.class.Card)
    const added = new Set<Ref<Class<Doc>>>()
    const base = new Map<Ref<Class<Doc>>, Class<Doc>[]>()
    for (const _id of descendants) {
      if (added.has(_id)) continue
      const _class = hierarchy.getClass(_id)
      if (_class.label === undefined) continue
      if (_class.kind !== ClassifierKind.CLASS) continue
      if ((_class as MasterTag).removed === true) continue
      added.add(_id)
      const descendants = hierarchy.getDescendants(_id)
      const toAdd: Class<Doc>[] = []
      for (const desc of descendants) {
        if (added.has(desc)) continue
        const _class = hierarchy.getClass(desc)
        if (_class.label === undefined) continue
        if (_class.kind !== ClassifierKind.CLASS) continue
        if ((_class as MasterTag).removed === true) continue
        added.add(desc)
        toAdd.push(_class)
      }
      base.set(_id, toAdd)
    }
    const result: [DropdownIntlItem, DropdownIntlItem[]][] = []
    for (const [key, value] of base) {
      try {
        const clazz = hierarchy.getClass(key)
        result.push([
          { id: key, label: clazz.label, icon: clazz.icon },
          value
            .map((it) => ({ id: it._id, label: it.label, icon: it.icon }))
            .sort((a, b) => a.label.localeCompare(b.label))
        ])
      } catch {}
    }
    return result
  }

  const classes = filterClasses()
</script>

<Modal
  label={getEmbeddedLabel('Create card from message')}
  type="type-popup"
  okLabel={presentation.string.Create}
  okAction={attachCard}
  canSave={selectedType !== undefined && title.trim() !== '' && _message.thread == null}
  onCancel={() => dispatch('close')}
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <ModernEditbox bind:value={title} label={getEmbeddedLabel('Title')} size="large" kind="ghost" />
  </div>

  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label"><Label label={getEmbeddedLabel('Card type')} /></span>
      <NestedDropdown
        items={classes}
        label={getEmbeddedLabel('Card type')}
        on:selected={(e) => {
          selectedType = e.detail
        }}
      />
    </div>
    <div class="mt-4" />
    <MessagePresenter {card} message={{ ..._message, reactions: [], thread: undefined }} readonly={true} padding="0" />
  </div>
  <svelte:fragment slot="footer">
    {#if _message.thread != null && !inProgress}
      <div class="footer-error">
        <Label label={communication.string.MessageAlreadyHasCardAttached} />
      </div>
    {/if}
  </svelte:fragment>
</Modal>

<style lang="scss">
  .footer-error {
    display: flex;
    color: var(--global-error-TextColor);
    font-size: 0.875rem;
    font-weight: 400;
  }
</style>
