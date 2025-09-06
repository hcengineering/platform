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
  import { type Integration } from '@hcengineering/account-client'
  import { IntlString } from '@hcengineering/platform'
  import setting from '@hcengineering/setting'
  import { Label } from '@hcengineering/ui'

  export let integration: Integration | undefined

  function getIntegrationLabel (): IntlString {
    if (integration === undefined) {
      return setting.string.Available
    }
    if (integration.workspaceUuid == null) {
      return setting.string.Connected
    }
    return setting.string.Integrated
  }
</script>

<span
  class="integration-label"
  class:new-connection={integration === undefined}
  class:connected={integration !== undefined && integration.workspaceUuid == null}
  class:integrated={integration?.workspaceUuid != null}
>
  <Label label={getIntegrationLabel()} />
</span>

<style>
  .integration-label {
    display: inline-block;
    padding: 0.1875rem 0.5rem;
    border-radius: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    border: 1px solid;
  }

  .new-connection {
    background-color: var(--theme-label-gray-bg-color);
    color: var(--theme-label-gray-color);
    border-color: var(--theme-label-gray-border-color);
  }

  .connected {
    background-color: var(--theme-label-blue-bg-color);
    color: var(--theme-label-blue-color);
    border-color: var(--theme-label-blue-border-color);
  }

  .integrated {
    background-color: var(--theme-label-green-bg-color);
    color: var(--theme-label-green-color);
    border-color: var(--theme-label-green-border-color);
  }
</style>
