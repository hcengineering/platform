<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { TestProject } from '@hcengineering/test-management'

  export let value: TestProject | undefined
  export let inline: boolean = false
  export let accent: boolean = false
</script>

{#if value}
  <div class="flex-presenter cursor-default" class:inline-presenter={inline}>
    <span class="label no-underline nowrap" class:fs-bold={accent}>
      {value.name}
    </span>
  </div>
{/if}
