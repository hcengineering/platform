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
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { Integration, IntegrationType } from '@hcengineering/setting'
  import setting from '@hcengineering/setting'

  import { Header, Breadcrumb, NotificationSeverity, addNotification, themeStore } from '@hcengineering/ui'
  import { translate } from '@hcengineering/platform'
  import PluginCard from './PluginCard.svelte'
  import IntegrationErrorNotification from './IntegrationErrorNotification.svelte'

  const typeQuery = createQuery()
  const integrationQuery = createQuery()

  let integrations: Integration[] = []
  let integrationTypes: IntegrationType[] = []

  typeQuery.query(setting.class.IntegrationType, {}, (res) => {
    integrationTypes = res
  })
  integrationQuery.query(setting.class.Integration, { createdBy: { $in: getCurrentAccount().socialIds } }, (res) => {
    integrations = res.filter((p) => p.value !== '')
  })

  function getIntegrations (type: Ref<IntegrationType>, integrations: Integration[]): Integration[] {
    return integrations.filter((p) => p.type === type)
  }

  onMount(async () => {
    // Check URL parameters for error message
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('integrationError')

    if (error != null) {
      const decodedError = decodeURIComponent(error)
      console.error('Integration error:', decodedError)
      await showErrorNotification(decodedError)
      // Clean up integrationError parameter from the URL
      urlParams.delete('integrationError')
      const newParams = urlParams.toString()
      const newUrl =
        window.location.pathname + (newParams != null && newParams !== '' ? `?${newParams}` : '') + window.location.hash
      window.history.replaceState({}, document.title, newUrl)
    }
  })

  async function showErrorNotification (error: string): Promise<void> {
    const errorMessage =
      error === IntegrationError.EMAIL_IS_ALREADY_USED
        ? await translate(setting.string.EmailIsUsed, {}, $themeStore.language)
        : await translate(setting.string.IntegrationError, {}, $themeStore.language)
    addNotification(
      await translate(setting.string.IntegrationFailed, {}, $themeStore.language),
      errorMessage,
      IntegrationErrorNotification,
      undefined,
      NotificationSeverity.Error
    )
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Integrations} label={setting.string.Integrations} size={'large'} isCurrent />
  </Header>

  <div class="cards_grid">
    {#each integrationTypes as integrationType (integrationType._id)}
      {#if integrationType.allowMultiple}
        {#each getIntegrations(integrationType._id, integrations) as integration (integration._id)}
          <PluginCard {integration} {integrationType} />
        {/each}
        <PluginCard integration={undefined} {integrationType} />
      {:else}
        <PluginCard integration={integrations.find((p) => p.type === integrationType._id)} {integrationType} />
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .cards_grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, auto));
    grid-auto-rows: minmax(12.5rem, auto);
    grid-gap: 1.5rem;
    padding: 1.5rem;
    overflow: auto;
  }
</style>
