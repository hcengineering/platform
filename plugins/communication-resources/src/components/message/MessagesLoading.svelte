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
  import { Label, Loading } from '@hcengineering/ui'

  import communication from '../../plugin'
</script>

<div class="loader" role="status" aria-live="polite" aria-busy="true">
  <Loading size="small" />
  <Label label={communication.string.Loading} />
</div>

<style lang="scss">
  .loader {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--global-secondary-TextColor);
    font-weight: 500;
    height: 5rem;
    min-height: 5rem;
  }
</style>
