<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { onMount } from 'svelte'
  import { Icon, Label, tooltip } from '@hcengineering/ui'
  import contact, { SocialIdentity, SocialIdentityProvider, getCurrentEmployee } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'

  export let value: SocialIdentity
  export let socialIdProvider: SocialIdentityProvider | undefined = undefined
  export let shouldShowAvatar = true

  const client = getClient()
  let isOwner = false

  onMount(() => {
    if (socialIdProvider == null) {
      socialIdProvider = client.getModel().findAllSync(contact.class.SocialIdentityProvider, { type: value.type })[0]
    }
  })

  $: icon = socialIdProvider?.icon ?? contact.icon.Profile
  $: {
    const me = getCurrentEmployee()
    isOwner = me != null && value.attachedTo === me
  }
</script>

{#if socialIdProvider != null}
  <div class="flex-row-center" class:flex-gap-2={shouldShowAvatar}>
    <div
      class="icon"
      use:tooltip={{
        component: Label,
        props: { label: socialIdProvider.label }
      }}
    >
      <Icon size="full" {icon} />
    </div>

    <div class="flex-col flex-gap-0-5">
      {#if isOwner}
        <div>{value.displayValue ?? value.value}</div>
        {#if shouldShowAvatar}
          <div class="type"><Label label={socialIdProvider.label} /></div>
        {/if}
      {:else}
        <div class="type"><Label label={socialIdProvider.label} /></div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .type {
    color: var(--theme-dark-color);
    font-size: 0.75rem;
  }
</style>
