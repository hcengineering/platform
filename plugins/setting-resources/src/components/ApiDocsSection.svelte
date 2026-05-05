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
  import { fetchMetadataLocalStorage, Label } from '@hcengineering/ui'
  import { copyTextToClipboard } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import login from '@hcengineering/login'

  let showApiDocs = false

  $: {
    const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint) ?? ''
    baseApiUrl = (endpoint !== '' ? endpoint : window.location.origin) + '/api/v1'
  }
  let baseApiUrl: string
  $: curlExample = `curl -H "Authorization: Bearer YOUR_TOKEN" \\\n  "${baseApiUrl}/find-all/WORKSPACE_ID?class=tracker:class:Project"`

  async function copySnippet (text: string): Promise<void> {
    await copyTextToClipboard(text)
  }
</script>

<div class="api-docs-section">
  <button
    class="api-docs-toggle"
    on:click={() => {
      showApiDocs = !showApiDocs
    }}
  >
    <span class="api-docs-arrow" class:expanded={showApiDocs}>&#9654;</span>
    <Label label={setting.string.ApiUsageTitle} />
  </button>
  {#if showApiDocs}
    <div class="api-docs-content">
      <p class="api-docs-desc"><Label label={setting.string.ApiUsageDescription} /></p>

      <div class="api-docs-block">
        <span class="api-docs-label"><Label label={setting.string.ApiBaseUrl} /></span>
        <code
          class="api-docs-code clickable"
          role="button"
          tabindex="0"
          on:click={() => copySnippet(baseApiUrl)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') copySnippet(baseApiUrl)
          }}>{baseApiUrl}</code
        >
      </div>

      <p class="api-docs-note"><Label label={setting.string.ApiWorkspaceId} /></p>

      <div class="api-docs-endpoints">
        <div class="api-docs-endpoint">
          <div class="api-docs-method get">GET</div>
          <code>/api/v1/ping/:workspaceId</code>
          <span class="api-docs-endpoint-desc"><Label label={setting.string.ApiEndpointPing} /></span>
        </div>
        <div class="api-docs-endpoint">
          <div class="api-docs-method get">GET</div>
          <code>/api/v1/find-all/:workspaceId?class=...</code>
          <span class="api-docs-endpoint-desc"><Label label={setting.string.ApiEndpointFindAll} /></span>
        </div>
        <div class="api-docs-endpoint">
          <div class="api-docs-method post">POST</div>
          <code>/api/v1/find-all/:workspaceId</code>
          <span class="api-docs-endpoint-desc"><Label label={setting.string.ApiEndpointFindAllPost} /></span>
        </div>
        <div class="api-docs-endpoint">
          <div class="api-docs-method post">POST</div>
          <code>/api/v1/tx/:workspaceId</code>
          <span class="api-docs-endpoint-desc"><Label label={setting.string.ApiEndpointTx} /></span>
        </div>
        <div class="api-docs-endpoint">
          <div class="api-docs-method get">GET</div>
          <code>/api/v1/load-model/:workspaceId</code>
          <span class="api-docs-endpoint-desc"><Label label={setting.string.ApiEndpointLoadModel} /></span>
        </div>
        <div class="api-docs-endpoint">
          <div class="api-docs-method get">GET</div>
          <code>/api/v1/account/:workspaceId</code>
          <span class="api-docs-endpoint-desc"><Label label={setting.string.ApiEndpointAccount} /></span>
        </div>
      </div>

      <div class="api-docs-example">
        <span class="api-docs-label">Example</span>
        <pre
          class="api-docs-pre clickable"
          role="button"
          tabindex="0"
          on:click={() => copySnippet(curlExample)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') copySnippet(curlExample)
          }}>{curlExample}</pre>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .api-docs-section {
    margin-top: 2rem;
    border-top: 1px solid var(--theme-popup-divider);
    padding-top: 1rem;
  }
  .api-docs-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--theme-content-color);
    user-select: none;
    background: none;
    border: none;
    padding: 0;
  }
  .api-docs-arrow {
    display: inline-block;
    font-size: 0.625rem;
    transition: transform 0.15s ease;
    color: var(--theme-dark-color);
  }
  .api-docs-arrow.expanded {
    transform: rotate(90deg);
  }
  .api-docs-content {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .api-docs-desc {
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
    line-height: 1.5;
  }
  .api-docs-note {
    font-size: 0.75rem;
    color: var(--theme-dark-color);
    font-style: italic;
  }
  .api-docs-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .api-docs-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--theme-dark-color);
  }
  .api-docs-code {
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-family: var(--mono-font);
    font-size: 0.75rem;
    color: var(--theme-content-color);
    width: fit-content;
  }
  .api-docs-endpoints {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .api-docs-endpoint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;

    code {
      font-family: var(--mono-font);
      color: var(--theme-content-color);
    }
  }
  .api-docs-endpoint-desc {
    color: var(--theme-dark-color);
    font-size: 0.6875rem;
  }
  .api-docs-method {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    font-family: var(--mono-font);
    text-transform: uppercase;
  }
  .api-docs-method.get {
    background-color: var(--tag-accent-PorpoiseColor);
    color: var(--tag-on-accent-PorpoiseColor);
  }
  .api-docs-method.post {
    background-color: var(--tag-accent-SunshineColor);
    color: var(--tag-on-accent-SunshineColor);
  }
  .api-docs-example {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }
  .api-docs-pre {
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.375rem;
    padding: 0.625rem 0.75rem;
    font-family: var(--mono-font);
    font-size: 0.6875rem;
    line-height: 1.6;
    color: var(--theme-content-color);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
  }
  .clickable {
    cursor: pointer;
    &:hover {
      border-color: var(--theme-button-hovered);
    }
  }
</style>
