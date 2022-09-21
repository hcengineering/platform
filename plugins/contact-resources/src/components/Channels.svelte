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
  import { Channel } from '@hcengineering/contact'
  import type { AttachedData, Doc, Ref } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import { CircleButton, eventToHTMLElement, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import ChannelsView from './ChannelsView.svelte'

  export let integrations: Set<Ref<Doc>> | undefined = undefined

  export let channels: AttachedData<Channel>[] = []

  const dispatch = createEventDispatcher()
</script>

{#if channels?.length === 0}
  <div id="channels-edit" class="flex-row-center">
    <CircleButton
      icon={IconAdd}
      size={'small'}
      selected
      on:click={(ev) =>
        showPopup(contact.component.SocialEditor, { values: channels }, eventToHTMLElement(ev), (result) => {
          if (result !== undefined) {
            dispatch('change', result)
          }
        })}
    />
    <span class="ml-2"><Label label={presentation.string.AddSocialLinks} /></span>
  </div>
{:else}
  <div class="flex-row-center min-w-min">
    <ChannelsView value={channels} size={'small'} {integrations} on:click />
    <div id="channels-edit" class="ml-1">
      <CircleButton
        icon={contact.icon.Edit}
        size={'small'}
        selected
        on:click={(ev) =>
          showPopup(contact.component.SocialEditor, { values: channels }, eventToHTMLElement(ev), (result) => {
            if (result !== undefined) {
              dispatch('change', result)
            }
          })}
      />
    </div>
  </div>
{/if}
