<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { WithLookup } from '@hcengineering/core'
  import { DocumentVersion, DocumentVersionState } from '@hcengineering/document'
  import { EastSideColor, FernColor, Label, SeaBuckthornColor } from '@hcengineering/ui'
  import document from '../plugin'

  export let value: WithLookup<DocumentVersion>
</script>

{#if value}
  <div class="status-container">
    {#if value.state === DocumentVersionState.Draft}
      <div class="status p-1" style:background-color={EastSideColor}>
        <Label label={document.string.Draft} />
      </div>
    {/if}
    {#if value.state === DocumentVersionState.Approved}
      <div class="status p-1" style:background-color={SeaBuckthornColor}>
        <Label label={document.string.Approved} />
      </div>
    {/if}
    {#if value.state === DocumentVersionState.Rejected}
      <div class="status p-1" style:background-color={FernColor}>
        <Label label={document.string.Rejected} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .status-container {
    display: flex;
    .status {
      border-radius: 8px;
      margin: 0.1rem;

      font-weight: 500;
      font-size: 10px;

      text-transform: uppercase;
      color: #ffffff;

      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
