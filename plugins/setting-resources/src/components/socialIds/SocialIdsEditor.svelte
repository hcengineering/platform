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
  import contact from '@hcengineering/contact'
  import { getCurrentAccount, loginSocialTypes, notEmpty, SocialIdType } from '@hcengineering/core'
  import { getClient, hasResource } from '@hcengineering/presentation'
  import { Action, Button, createFocusManager, FocusHandler, Label, Menu, Scroller, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import type { PersonRating } from '@hcengineering/rating'
  import ratingPlugin from '@hcengineering/rating'
  import setting from '../../plugin'
  import SocialIdRow from './SocialIdRow.svelte'

  export let rating: PersonRating | undefined

  let account = getCurrentAccount()
  const manager = createFocusManager()
  const client = getClient()
  const socialIdProviders = new Map(
    client
      .getModel()
      .findAllSync(contact.class.SocialIdentityProvider, {})
      .map((it) => [it.type, it])
  )

  $: socialIds = account.fullSocialIds.filter((si) => socialIdProviders.has(si.type) && si.isDeleted !== true)

  const addActions: Action[] = Array.from(socialIdProviders.values())
    .map((pr) => {
      const { creator } = pr
      if (creator == null) return null

      return {
        icon: pr.icon ?? contact.icon.Profile,
        label: pr.label,
        action: async () => {
          showPopup(creator, { provider: pr, onAdded: handleAccountUpdated })
        }
      }
    })
    .filter(notEmpty)

  function handleAdd (ev: MouseEvent): void {
    showPopup(Menu, { actions: addActions }, ev.target as HTMLElement)
  }

  $: onlyHuly = socialIds.filter((it) => it.type === SocialIdType.HULY).length === 1
  $: onlyLogin = socialIds.filter((it) => loginSocialTypes.includes(it.type)).length === 1

  function handleAccountUpdated (): void {
    account = getCurrentAccount()
  }

  $: socialIdRatingTotal =
    rating != null ? Object.values(rating?.socialIds ?? {}).reduce((sum, val) => sum + (val ?? 0), 0) : 0
</script>

<FocusHandler {manager} />

<div class="flex-col flex-gap-2">
  <div class="title flex-between">
    <Label label={setting.string.ManageIdentities} />
    <Button icon={view.icon.Add} kind="icon" size="small" on:click={handleAdd} />
  </div>

  <div class="items">
    <Scroller>
      {#each socialIds as socialId}
        {@const socialIdProvider = socialIdProviders.get(socialId.type)}
        {@const canRelease =
          socialId.type === SocialIdType.HULY
            ? !onlyHuly
            : loginSocialTypes.includes(socialId.type)
              ? !onlyLogin
              : true}
        {#if socialIdProvider != null && socialId.type !== SocialIdType.HULY}
          {@const socialIdRating =
            rating != null && hasResource(ratingPlugin.component.RatingRing)
              ? rating.socialIds?.[socialId?._id]
              : undefined}
          <div class="item">
            <SocialIdRow
              {socialId}
              {socialIdProvider}
              {canRelease}
              on:released={handleAccountUpdated}
              {socialIdRating}
              {socialIdRatingTotal}
            />
          </div>
        {/if}
      {/each}
    </Scroller>
  </div>
</div>

<style lang="scss">
  .title {
    margin: 1rem 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 500;
  }

  .items {
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    min-height: 10rem;
    max-height: 25rem;
  }

  .item {
    &:not(:last-child) {
      border-bottom: 1px solid var(--theme-divider-color);
    }
  }
</style>
