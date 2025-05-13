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
  import { DocumentQuery } from '@hcengineering/core'
  import { TableBrowser } from '@hcengineering/view-resources'
  import emojiPlugin, { CustomEmoji } from '@hcengineering/emoji'
  import { showPopup, Breadcrumb, Button, Header, IconAdd } from '@hcengineering/ui'
  import CustomEmojiPresenter from './CustomEmojiPresenter.svelte'
  import CreateCustomEmojiPopup from './CreateCustomEmojiPopup.svelte'

  const resultQuery: DocumentQuery<CustomEmoji> = {}

  function showCreateDialog (ev: Event): void {
    showPopup(CreateCustomEmojiPopup, ev.target as HTMLElement)
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={emojiPlugin.icon.Emoji} label={emojiPlugin.string.CustomEmojis} size={'large'} isCurrent />
    <svelte:fragment slot="search"></svelte:fragment>
    <svelte:fragment slot="actions">
      <slot />
      <Button icon={IconAdd} label={emojiPlugin.string.Create} kind={'primary'} on:click={showCreateDialog} />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__column content">
    <TableBrowser
      _class={emojiPlugin.class.CustomEmoji}
      config={[
        'shortcode',
        {
          key: 'image',
          label: emojiPlugin.string.Image,
          presenter: CustomEmojiPresenter
        },
        'createdBy'
      ]}
      enableChecking={false}
      query={resultQuery}
      showNotification
    />
  </div>
</div>
