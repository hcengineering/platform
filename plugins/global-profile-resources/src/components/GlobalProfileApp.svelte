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
  import { onMount } from 'svelte'

  import {
    Button,
    Popup,
    showPopup,
    themeStore,
    IconEdit,
    Icon,
    tooltip,
    Label,
    TooltipInstance,
    getLocation as getPlatformLocation,
    Loading
  } from '@hcengineering/ui'
  import { PersonWithProfile } from '@hcengineering/account-client'
  import { type AccountUuid, type PersonUuid } from '@hcengineering/core'
  import globalProfile from '@hcengineering/global-profile'
  import view from '@hcengineering/view'
  import { getMetadata } from '@hcengineering/platform'

  import { getAvatarText, getDisplayName, getLocation, getAccountClient, getAvatarColorForId } from '../utils'
  import EditProfilePopup from './EditGlobalProfilePopup.svelte'

  let profile: PersonWithProfile | null = null
  const loc = getPlatformLocation()
  const userId = loc.path[1] as PersonUuid
  const accountClient = getAccountClient()
  let myAccount: AccountUuid | null = null
  let loading: boolean = false
  $: isMyProfile = myAccount != null && userId === myAccount

  $: backgroundImage = $themeStore.dark
    ? globalProfile.image.ProfileBackground
    : globalProfile.image.ProfileBackgroundLight

  onMount(async () => {
    if (userId == null) {
      console.warn('User ID is not defined')
      return
    }

    loading = true
    try {
      try {
        if (myAccount == null) {
          const loginInfo = await accountClient.getLoginInfoByToken()
          if (loginInfo != null) {
            myAccount = (loginInfo as any).account
          }
        }
      } catch (e) {
        // Could not get current user, maybe unauth access
      }

      profile = await accountClient.getUserProfile(userId)
    } catch (e) {
      console.error(e)
    } finally {
      loading = false
    }
  })

  $: displayName = profile != null ? getDisplayName(profile) : ''
  $: avatarName = profile != null ? getAvatarText(profile) : ''
  $: avatarColor = getAvatarColorForId(userId ?? '', $themeStore.dark)
  $: location = profile != null ? getLocation(profile) : ''

  function handleEdit (): void {
    if (profile == null || !isMyProfile) return

    showPopup(
      EditProfilePopup,
      {
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
        bio: profile.bio ?? '',
        isPublic: profile.isPublic ?? false
      },
      undefined,
      undefined,
      async (result) => {
        if (result !== undefined && profile !== null) {
          const { firstName, lastName, city, country, bio, isPublic } = result
          const nameChanged = firstName !== profile.firstName || lastName !== profile.lastName
          const profileChanged =
            city !== profile.city || country !== profile.country || bio !== profile.bio || isPublic !== profile.isPublic
          // Update the profile with the returned values
          profile = {
            ...profile,
            firstName: result.firstName,
            lastName: result.lastName,
            city: result.city,
            country: result.country,
            bio: result.bio,
            isPublic: result.isPublic
          }

          if (nameChanged) {
            await accountClient.changeUsername(profile.firstName, profile.lastName)
          }

          if (profileChanged) {
            await accountClient.setMyProfile(profile)
          }
        }
      }
    )
  }
</script>

<div class="global-profile-app">
  <div class="profile">
    {#if loading}
      <Loading />
    {:else if profile != null}
      <div
        class="header"
        style={`background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 25%, var(--theme-popup-color) 95%), url("${getMetadata(backgroundImage)}"); background-size: cover;`}
      ></div>
      <div class="contentCtr">
        <div class="content">
          <div class="name">
            {displayName}
          </div>
          {#if profile.bio != null && profile.bio !== ''}
            <div class="bio">{profile.bio}</div>
          {:else if isMyProfile}
            <div class="bio placeholder" on:click={handleEdit}>
              <Label label={globalProfile.string.AddBioPlaceholder} />
            </div>
          {/if}
          {#if location !== ''}
            <div class="location">{location}</div>
          {:else if isMyProfile}
            <div class="location placeholder" on:click={handleEdit}>
              <Label label={globalProfile.string.AddLocationPlaceholder} />
            </div>
          {/if}
        </div>
        {#if isMyProfile}
          <div class="actions">
            <div
              use:tooltip={{
                component: Label,
                props: {
                  label: profile.isPublic
                    ? globalProfile.string.PublicProfileDescription
                    : globalProfile.string.PrivateProfileDescription
                }
              }}
            >
              <Icon icon={profile.isPublic ? globalProfile.icon.Globe : view.icon.EyeCrossed} size="medium" />
            </div>
            <Button icon={IconEdit} kind="ghost" size="medium" iconProps={{ size: 'medium' }} on:click={handleEdit} />
          </div>
        {/if}
      </div>
      <div class="avatarCtr">
        <div class="avatar" style:background-color={avatarColor.icon}>
          <div class="avatarText" style:color={avatarColor.iconText} data-name={avatarName.toLocaleUpperCase()} />
        </div>
      </div>
    {:else}
      <div class="not-found">
        <div class="not-found-content">
          <div class="not-found-icon">
            <Icon icon={view.icon.EyeCrossed} size="x-large" fill={'var(--primary-button-default)'} />
          </div>
          <div class="not-found-text">
            <Label label={globalProfile.string.ProfileNotAvailable} />
          </div>
        </div>
      </div>
    {/if}
  </div>

  <TooltipInstance />
  <Popup />
</div>

<style lang="scss">
  .global-profile-app {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
  }

  .profile {
    position: relative;
    width: 50rem;
    min-height: 25rem;
    border: 1px solid var(--theme-divider-color);
    background-color: var(--theme-popup-color);
    border-radius: 0.8rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .not-found {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 25rem;
    padding: 2rem;
  }

  .not-found-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 3rem 4rem;
    background-color: var(--theme-button-default);
    border-radius: 1rem;
    border: 1px solid var(--theme-divider-color);
  }

  .not-found-icon {
    opacity: 0.9;
  }

  .not-found-text {
    color: var(--theme-content-color);
    font-size: 1.125rem;
    font-weight: 500;
    text-align: center;
  }

  .header {
    width: 100%;
    height: 12.5rem;
    border-top-left-radius: 0.8rem;
    border-top-right-radius: 0.8rem;
    overflow: hidden;
  }

  .contentCtr {
    position: relative;
    width: 100%;
    flex: 1 1 0;
    border-bottom-left-radius: 0.8rem;
    border-bottom-right-radius: 0.8rem;
  }

  .edit {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
  }

  .actions {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .content {
    padding: 4.5rem 1.5rem 3.5rem 1.5rem;
  }

  .avatarCtr {
    width: 10rem;
    height: 10rem;
    background-color: var(--theme-popup-color);
    position: absolute;
    left: 1.5rem;
    top: 6rem;
    border-radius: 100%;
  }

  .avatar {
    width: 9.5rem;
    height: 9.5rem;
    background-color: aquamarine;
    position: absolute;
    margin: auto;
    border-radius: 100%;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .avatarText {
    font-weight: 500;
    letter-spacing: -0.05em;
    font-size: 5rem;

    &::after {
      content: attr(data-name);
      transform: translate(-50%, -50%);
      position: absolute;
      top: 50%;
      left: 50%;
    }
  }

  .name {
    font-size: 2rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .bio {
    margin-top: 0.75rem;
    width: 60%;
    color: var(--theme-content-color);
    font-size: 1rem;
    text-align: justify;

    &.placeholder {
      font-style: italic;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .location {
    margin-top: 1rem;
    color: var(--theme-text-placeholder-color);
    font-weight: 500;

    &.placeholder {
      font-style: italic;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }
</style>
