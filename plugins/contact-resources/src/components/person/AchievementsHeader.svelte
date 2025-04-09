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
  import contact from '@hcengineering/contact'
  import { Label } from '@hcengineering/ui'
</script>

<div class="header-container gap-2 px-4">
  <span class="text-md font-normal content-color">
    <Label label={contact.string.Achievements} />
  </span>
  <div class="divider" />
</div>

<style>
  .header-container {
    display: flex;
    padding: 0 12px;
    align-items: center;
  }
  .divider {
    width: 100%;
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
