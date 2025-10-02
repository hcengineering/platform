<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { AccountUuid, notEmpty, PersonUuid } from '@hcengineering/core'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { Employee } from '@hcengineering/contact'
  import { employeeByAccountStore } from '@hcengineering/contact-resources'
  import { EmojiPresenter, getEmojiByUnicode } from '@hcengineering/emoji-resources'
  import { isCustomEmoji } from '@hcengineering/emoji'

  export let persons: PersonUuid[] = []
  export let emoji: string

  let employees: Employee[] = []

  $: employees = persons.map((it) => $employeeByAccountStore.get(it as AccountUuid)).filter(notEmpty)

  let shortCode: string = ''
  $: extendedEmoji = getEmojiByUnicode(emoji)
  $: shortCode =
    extendedEmoji && isCustomEmoji(extendedEmoji) ? extendedEmoji.shortcode : extendedEmoji?.shortcodes?.[0] ?? ''
</script>

<div class="m-2 flex-col flex-gap-2">
  <div class="emoji">
    <EmojiPresenter {emoji} />
    {#if shortCode}
      <span class="shortcode">
        :{shortCode}:
      </span>
    {/if}
  </div>
  {#each employees as emp (emp._id)}
    <ObjectPresenter objectId={emp._id} _class={emp._class} value={emp} disabled />
  {/each}
</div>

<style lang="scss">
  .emoji {
    font-size: 1.5rem;
    color: var(--global-primary-TextColor);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .shortcode {
    font-size: 1rem;
    font-weight: 500;
    color: var(--global-secondary-TextColor);
  }
</style>
