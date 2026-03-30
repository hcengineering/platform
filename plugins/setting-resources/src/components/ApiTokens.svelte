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
  import { Breadcrumb, Header, IconAdd, Label, Loading, ModernButton, Scroller, showPopup } from '@hcengineering/ui'
  import { MessageBox } from '@hcengineering/presentation'
  import { translate } from '@hcengineering/platform'
  import setting from '@hcengineering/setting'
  import { type ApiTokenInfo } from '@hcengineering/account-client'
  import { getAccountClient } from '../utils'
  import { onMount } from 'svelte'
  import { themeStore } from '@hcengineering/theme'
  import ApiTokenCreatePopup from './ApiTokenCreatePopup.svelte'
  import ApiDocsSection from './ApiDocsSection.svelte'

  let loading = true
  let loadError = false
  let tokens: ApiTokenInfo[] = []

  const statusLabelMap = {
    active: setting.string.ApiTokenStatusActive,
    expiring: setting.string.ApiTokenStatusExpiring,
    revoked: setting.string.ApiTokenStatusRevoked,
    expired: setting.string.ApiTokenStatusExpired
  } as const

  function loadTokens(): void {
    loading = true
    loadError = false
    getAccountClient()
      .listApiTokens()
      .then((res) => {
        tokens = res.sort((a, b) => b.createdOn - a.createdOn)
        loading = false
      })
      .catch((err) => {
        console.error('Failed to load API tokens', err)
        tokens = []
        loading = false
        loadError = true
      })
  }

  function create(): void {
    showPopup(ApiTokenCreatePopup, {}, 'top', (res) => {
      if (res === true) {
        loadTokens()
      }
    })
  }

  function revoke(token: ApiTokenInfo): void {
    showPopup(MessageBox, {
      label: setting.string.ApiTokenRevoke,
      message: setting.string.ApiTokenRevokeConfirm,
      dangerous: true,
      action: async () => {
        try {
          await getAccountClient().revokeApiToken(token.id)
        } catch (err) {
          console.error('Failed to revoke API token', err)
        }
        loadTokens()
      }
    })
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString($themeStore.language ?? 'en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  let scopeLabels = {
    readOnly: 'Read Only',
    readWrite: 'Read & Write',
    fullAccess: 'Full Access'
  }

  async function resolveScopeLabels(): Promise<void> {
    const lang = $themeStore.language
    scopeLabels = {
      readOnly: await translate(setting.string.ApiTokenScopeReadOnly, {}, lang),
      readWrite: await translate(setting.string.ApiTokenScopeReadWrite, {}, lang),
      fullAccess: await translate(setting.string.ApiTokenScopeFullAccess, {}, lang)
    }
  }

  function getScopeLabel(token: ApiTokenInfo): string {
    const scopes = token.scopes
    if (scopes == null || scopes.length === 0) return scopeLabels.fullAccess
    const hasRead = scopes.includes('read:*')
    const hasWrite = scopes.includes('write:*')
    const hasDelete = scopes.includes('delete:*')
    if (hasRead && hasWrite && hasDelete && scopes.length === 3) return scopeLabels.fullAccess
    if (hasRead && hasWrite && scopes.length === 2) return scopeLabels.readWrite
    if (hasRead && scopes.length === 1) return scopeLabels.readOnly
    return `${scopes.length} scopes`
  }

  function getStatus(token: ApiTokenInfo): 'active' | 'expiring' | 'revoked' | 'expired' {
    if (token.revoked) return 'revoked'
    const now = Date.now()
    if (token.expiresOn < now) return 'expired'
    if (token.expiresOn - now < 7 * 86400000) return 'expiring'
    return 'active'
  }

  onMount(() => {
    loadTokens()
    void resolveScopeLabels()
  })
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.ApiToken} label={setting.string.ApiTokens} size="large" isCurrent />
    <svelte:fragment slot="actions">
      <ModernButton
        kind="primary"
        icon={IconAdd}
        label={setting.string.CreateApiToken}
        disabled={loading}
        size="small"
        on:click={create}
      />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column p-6">
      {#if loading}
        <Loading />
      {:else if loadError}
        <div class="hulyComponent-content__empty">
          <Label label={setting.string.ApiTokenLoadError} />
          <div class="mt-2">
            <ModernButton label={setting.string.Reconnect} size="small" on:click={loadTokens} />
          </div>
        </div>
      {:else if tokens.length === 0}
        <div class="hulyComponent-content__empty">
          <Label label={setting.string.ApiTokenNoTokens} />
        </div>
      {:else}
        <Scroller>
          <table class="antiGrid">
            <thead class="scroller-thead">
              <tr class="scroller-thead__tr">
                <th><Label label={setting.string.ApiTokenName} /></th>
                <th><Label label={setting.string.ApiTokenWorkspace} /></th>
                <th><Label label={setting.string.ApiTokenPermissions} /></th>
                <th><Label label={setting.string.Created} /></th>
                <th><Label label={setting.string.Expires} /></th>
                <th><Label label={setting.string.TokenStatus} /></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each tokens as token}
                {@const status = getStatus(token)}
                <tr class="antiGrid-row">
                  <td class="overflow-label font-medium-14">{token.name}</td>
                  <td class="overflow-label">{token.workspaceName}</td>
                  <td><span class="tag-item tag-scope">{getScopeLabel(token)}</span></td>
                  <td>{formatDate(token.createdOn)}</td>
                  <td>{token.revoked ? '—' : formatDate(token.expiresOn)}</td>
                  <td>
                    <span
                      class="tag-item"
                      class:tag-active={status === 'active'}
                      class:tag-warning={status === 'expiring'}
                      class:tag-negative={status === 'revoked' || status === 'expired'}
                    >
                      <Label label={statusLabelMap[status]} />
                    </span>
                  </td>
                  <td>
                    {#if !token.revoked}
                      <ModernButton
                        kind="negative"
                        label={setting.string.ApiTokenRevoke}
                        size="small"
                        on:click={() => {
                          revoke(token)
                        }}
                      />
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </Scroller>
      {/if}

      <ApiDocsSection />
    </div>
  </div>
</div>

<style lang="scss">
  .tag-item {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.6875rem;
    font-weight: 500;
  }
  .tag-active {
    background-color: var(--tag-accent-PorpoiseColor);
    color: var(--tag-on-accent-PorpoiseColor);
  }
  .tag-warning {
    background-color: var(--tag-accent-SunshineColor);
    color: var(--tag-on-accent-SunshineColor);
  }
  .tag-negative {
    background-color: var(--tag-accent-FlamingoColor);
    color: var(--tag-on-accent-FlamingoColor);
  }
  .tag-scope {
    background-color: var(--theme-button-default);
    color: var(--theme-content-color);
  }
</style>
