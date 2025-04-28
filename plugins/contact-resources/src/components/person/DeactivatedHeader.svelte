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
  .deactivated-text {
    justify-content: center;
    display: flex;
    flex-direction: column;
  }

  .deactivated-label {
    flex: 1 1 0;
    height: 2rem;
    border-radius: 0.375rem;
    justify-content: flex-start;
    align-items: center;
    display: flex;
  }

  .action-buttons {
    justify-content: flex-start;
    align-items: center;
    gap: 0.75rem;
    display: flex;
  }

  .deactivated-header {
    width: 20rem;
    align-self: stretch;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    background: var(--theme-popup-deactivated);
    justify-content: flex-start;
    align-items: center;
    gap: 0.75rem;
    display: inline-flex;
    border: none;
    outline: none;
  }
</style>
