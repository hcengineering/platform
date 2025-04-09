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
  import { Label } from '@hcengineering/ui'
  import contact from '@hcengineering/contact'
  import type { IntlString } from '@hcengineering/platform'

  export let header: IntlString = contact.string.DeactivatedAccount
</script>

<div class="deactivated-header">
  <div class="deactivated-label">
    <div class="deactivated-text">
      <span class="text-normal font-medium content-color">
        <Label label={header} />
      </span>
    </div>
  </div>
  <div class="action-buttons">
    <slot name="actions" />
  </div>
</div>

<style>
  .deactivated-text-content {
    color: var(--text-2, #b9babd);
    font-size: 16px;
    font-family: Inter Display;
    font-weight: 500;
    line-height: 24px;
    word-wrap: break-word;
  }

  .deactivated-text {
    justify-content: center;
    display: flex;
    flex-direction: column;
  }

  .deactivated-label {
    flex: 1 1 0;
    height: 32px;
    border-radius: 6px;
    justify-content: flex-start;
    align-items: center;
    display: flex;
  }

  .action-buttons {
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
    display: flex;
  }

  .deactivated-header {
    width: 360px;
    align-self: stretch;
    padding-left: 16px;
    padding-right: 16px;
    padding-top: 12px;
    padding-bottom: 12px;
    background: var(--theme-popup-deactivated);
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
    display: inline-flex;
    border: none;
    outline: none;
  }
</style>
