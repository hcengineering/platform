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
  import { SelectUsersPopup } from '@hcengineering/contact-resources'
  import { ModernToggle } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import contact, { ChannelProvider, Person } from '@hcengineering/contact'
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../../../plugin'
  import { getAvailableChannelProviders } from '../../../utils'

  export let selected: Ref<Person>[] = []
  export let okLabel: IntlString | undefined = undefined

  const dispatch = createEventDispatcher()

  let channelProviders: ChannelProvider[] = []
  let isExternal = false

  $: void getAvailableChannelProviders(chunter.class.DirectMessage).then((res) => {
    channelProviders = res
  })
</script>

<SelectUsersPopup
  showStatus={true}
  multiselect={!isExternal}
  _class={isExternal ? contact.class.Person : contact.mixin.Employee}
  {okLabel}
  {selected}
  skipCurrentAccount={false}
  skipInactive={!isExternal}
  skipWithoutChannels={isExternal}
  channelProviders={isExternal ? channelProviders : []}
  on:close={(ev) => dispatch('close', { selected: ev.detail ?? [], isExternal })}
>
  <div class="toggle">
    <ModernToggle
      size="small"
      checked={isExternal}
      label={chunter.string.External}
      on:change={() => {
        isExternal = !isExternal
        selected = isExternal ? [] : selected
      }}
    />
  </div>
</SelectUsersPopup>

<style lang="scss">
  .toggle {
    padding: 0.5rem 1.25rem;
    margin-top: 0.5rem;
  }
</style>
