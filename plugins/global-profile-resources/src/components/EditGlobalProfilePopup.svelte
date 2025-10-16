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
  import { createEventDispatcher } from 'svelte'
  import { Button, Label, Toggle } from '@hcengineering/ui'
  import globalProfile from '@hcengineering/global-profile'
  import ProfileField from './ProfileField.svelte'

  export let firstName: string = ''
  export let lastName: string = ''
  export let city: string = ''
  export let country: string = ''
  export let bio: string = ''
  export let isPublic: boolean = true

  const dispatch = createEventDispatcher()
  const maxNameLength = 50
  const maxCityLength = 100
  const maxCountryLength = 50
  const maxBioLength = 150

  let editFirstName = firstName
  let editLastName = lastName
  let editCity = city
  let editCountry = country
  let editBio = bio
  let editIsPublic = isPublic

  $: firstNameCharCount = editFirstName?.length ?? 0
  $: lastNameCharCount = editLastName?.length ?? 0
  $: cityCharCount = editCity?.length ?? 0
  $: countryCharCount = editCountry?.length ?? 0
  $: bioCharCount = editBio?.length ?? 0

  $: firstNameExceedsLimit = firstNameCharCount > maxNameLength
  $: lastNameExceedsLimit = lastNameCharCount > maxNameLength
  $: cityExceedsLimit = cityCharCount > maxCityLength
  $: countryExceedsLimit = countryCharCount > maxCountryLength
  $: bioExceedsLimit = bioCharCount > maxBioLength
  $: firstNameIsEmpty = editFirstName.trim() === ''

  $: canSubmit =
    !firstNameExceedsLimit &&
    !lastNameExceedsLimit &&
    !cityExceedsLimit &&
    !countryExceedsLimit &&
    !bioExceedsLimit &&
    !firstNameIsEmpty &&
    (editFirstName.trim() !== firstName ||
      editLastName.trim() !== lastName ||
      editCity.trim() !== city ||
      editCountry.trim() !== country ||
      editBio.trim() !== bio ||
      editIsPublic !== isPublic)

  function handleSave (): void {
    if (!canSubmit) return

    dispatch('update', {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      city: editCity.trim(),
      country: editCountry.trim(),
      bio: editBio.trim(),
      isPublic: editIsPublic
    })
    dispatch('close')
  }

  function handleCancel (): void {
    dispatch('close')
  }
</script>

<div class="popup-container">
  <div class="popup-header">
    <Label label={globalProfile.string.EditProfile} />
  </div>

  <div class="popup-content">
    <div class="section-header">
      <Label label={globalProfile.string.GeneralInformation} />
    </div>

    <ProfileField
      bind:value={editFirstName}
      label={globalProfile.string.FirstName}
      placeholder={globalProfile.string.FirstNamePlaceholder}
      maxLength={maxNameLength}
      required
    />

    <ProfileField
      bind:value={editLastName}
      label={globalProfile.string.LastName}
      placeholder={globalProfile.string.LastNamePlaceholder}
      maxLength={maxNameLength}
    />

    <ProfileField
      bind:value={editCity}
      label={globalProfile.string.City}
      placeholder={globalProfile.string.CityPlaceholder}
      maxLength={maxCityLength}
    />

    <ProfileField
      bind:value={editCountry}
      label={globalProfile.string.Country}
      placeholder={globalProfile.string.CountryPlaceholder}
      maxLength={maxCountryLength}
    />

    <ProfileField
      bind:value={editBio}
      label={globalProfile.string.Bio}
      placeholder={globalProfile.string.BioPlaceholder}
      maxLength={maxBioLength}
      format="text-multiline"
      showCounter
    />

    <div class="visibility-section">
      <div class="visibility-header">
        <Label label={globalProfile.string.ProfileVisibility} />
      </div>
      <div class="visibility-toggle">
        <Toggle bind:on={editIsPublic} />
        <div class="visibility-label">
          <Label label={editIsPublic ? globalProfile.string.PublicProfile : globalProfile.string.PrivateProfile} />
        </div>
      </div>
      <div class="visibility-description">
        <Label
          label={editIsPublic
            ? globalProfile.string.PublicProfileDescription
            : globalProfile.string.PrivateProfileDescription}
        />
      </div>
    </div>
  </div>

  <div class="popup-footer">
    <Button label={globalProfile.string.Cancel} on:click={handleCancel} />
    <Button label={globalProfile.string.Save} kind="primary" disabled={!canSubmit} on:click={handleSave} />
  </div>
</div>

<style lang="scss">
  .popup-container {
    display: flex;
    flex-direction: column;
    width: 32rem;
    max-width: 90vw;
    padding: 1.5rem;
    background-color: var(--theme-popup-color);
    border-radius: 0.75rem;
    box-shadow: var(--theme-popup-shadow);
  }

  .popup-header {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--theme-caption-color);
  }

  .popup-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .section-header {
    font-weight: 500;
    color: var(--theme-caption-color);
    margin-bottom: 0.25rem;
  }

  .visibility-section {
    padding-top: 1rem;
    margin-top: 1rem;
    border-top: 1px solid var(--theme-divider-color);
  }

  .visibility-header {
    font-weight: 500;
    color: var(--theme-caption-color);
    margin-bottom: 0.75rem;
  }

  .visibility-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .visibility-label {
    font-weight: 500;
    color: var(--theme-content-color);
  }

  .visibility-description {
    font-size: 0.875rem;
    color: var(--theme-dark-color);
  }

  .popup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
