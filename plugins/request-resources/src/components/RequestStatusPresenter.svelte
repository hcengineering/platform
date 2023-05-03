<!--
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
-->
<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import { BooleanIcon, Label } from '@hcengineering/ui'
  import request from '../plugin'
  import { RequestStatus } from '@hcengineering/request'

  export let value: RequestStatus

  function getBooleanLabel (value: RequestStatus): IntlString {
    if (value === RequestStatus.Completed) return request.string.Completed
    if (value === RequestStatus.Rejected) return request.string.Rejected
    return request.string.Cancelled
  }
</script>

<div class="flex-row-center yesno-container">
  <BooleanIcon value={value === RequestStatus.Completed} />
  <span><Label label={getBooleanLabel(value)} /></span>
</div>

<style lang="scss">
  .yesno-container {
    max-width: fit-content;
    user-select: none;

    span {
      margin-left: 0.25rem;
      white-space: nowrap;
      text-transform: capitalize;
      font-weight: 500;
      color: var(--caption-color);
    }
  }
</style>
