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
  import { createEventDispatcher } from 'svelte'
  import {
    getCurrentAccount,
    loginSocialTypes,
    pickPrimarySocialId,
    setCurrentAccount,
    SocialId
  } from '@hcengineering/core'
  import {
    Button,
    getPlatformColorDef,
    Icon,
    Label,
    PaletteColorIndexes,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import contact, { SocialIdentityProvider, SocialIdentityRef } from '@hcengineering/contact'
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import { setPlatformStatus, unknownError } from '@hcengineering/platform'

  import setting from '../../plugin'
  import { getAccountClient } from '../../utils'

  export let socialId: SocialId
  export let socialIdProvider: SocialIdentityProvider
  export let canRelease: boolean = false

  const client = getClient()
  const accountClient = getAccountClient()
  const dispatch = createEventDispatcher()
  let currAcc = getCurrentAccount()

  $: icon = socialIdProvider?.icon ?? contact.icon.Profile
  $: isLogin = loginSocialTypes.includes(socialId.type)
  $: isPrimary = socialId._id === currAcc.primarySocialId

  async function doRelease (): Promise<void> {
    try {
      // Important to always get current account in the callback to avoid race conditions
      // with the account from the reactive variable
      // W/o it it was bringing back previously deleted social id if two are deleted in a row
      const currentAccount = getCurrentAccount()
      const currSocialIds = currentAccount.fullSocialIds

      const deletedSocialId = await accountClient.releaseSocialId(undefined, socialId.type, socialId.value, true)

      await client.updateDoc(
        contact.class.SocialIdentity,
        contact.space.Contacts,
        deletedSocialId._id as SocialIdentityRef,
        {
          key: deletedSocialId.key,
          value: deletedSocialId.value,
          isDeleted: deletedSocialId.isDeleted
        }
      )

      const newSocialIds = []
      for (const currSocialId of currSocialIds) {
        newSocialIds.push(currSocialId._id !== deletedSocialId._id ? currSocialId : deletedSocialId)
      }
      const newPrimarySocialId = pickPrimarySocialId(newSocialIds)._id

      // Don't need to update social ids because deleted social id retains its' _id
      const updatedAccount = {
        ...currentAccount,
        fullSocialIds: newSocialIds,
        primarySocialId: newPrimarySocialId
      }
      setCurrentAccount(updatedAccount)
      currAcc = updatedAccount
      dispatch('released')
    } catch (err: any) {
      console.error(err)
      void setPlatformStatus(unknownError(err))
    }
  }

  async function handleRelease (): Promise<void> {
    showPopup(MessageBox, {
      label: setting.string.ReleaseSocialId,
      message: setting.string.ReleaseSocialIdConfirm,
      params: { socialId: socialId.displayValue ?? socialId.value },
      dangerous: true,
      action: async () => {
        if (socialId._id === currAcc.primarySocialId) {
          showPopup(MessageBox, {
            label: setting.string.ReleasePrimarySocialId,
            message: setting.string.ReleasePrimarySocialIdConfirm,
            dangerous: true,
            action: async () => {
              await doRelease()

              location.reload()
            }
          })
        } else {
          await doRelease()
        }
      }
    })
  }
</script>

<div class="flex-row-center flex-gap-2 root">
  <div class="icon"><Icon size="full" {icon} /></div>

  <div class="flex-col flex-gap-0-5">
    <div>{socialId.displayValue ?? socialId.value}</div>
    <div class="type"><Label label={socialIdProvider.label} /></div>
  </div>

  <div class="flex-grow" />

  {#if isLogin}
    {@const color = getPlatformColorDef(PaletteColorIndexes.Turquoise, $themeStore.dark)}
    <div class="tag flex-center" style:background={color.background} style:border-color={color.color}>
      <Label label={setting.string.Login} />
    </div>
  {/if}

  {#if isPrimary}
    {@const color = getPlatformColorDef(PaletteColorIndexes.Ocean, $themeStore.dark)}
    <div class="tag flex-center" style:background={color.background} style:border-color={color.color}>
      <Label label={setting.string.Primary} />
    </div>
  {/if}

  {#if canRelease}
    <div class="on-hover">
      <Button label={setting.string.Release} kind="ghost" on:click={handleRelease} />
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    padding: 1rem;

    &:hover {
      background-color: var(--global-ui-highlight-BackgroundColor);
      .on-hover {
        display: block;
      }
    }
  }

  .on-hover {
    display: none;
  }

  .icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .type {
    color: var(--theme-dark-color);
    font-size: 0.75rem;
  }

  .tag {
    margin-left: 0.5rem;
    padding: 0 0.875rem;
    height: 1.75rem;
    color: var(--theme-halfcontent-color);
    background: var(--theme-list-button-color);
    border-radius: 0.875rem;
    border: 1px solid var(--theme-button-border);
    font-size: 0.8125rem;
    text-align: center;
  }
</style>
