<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { IntlString } from "@anticrm/platform"
  import { Label } from "@anticrm/ui"

  export let title: IntlString
  export let line: boolean = false
  export let params: any = undefined

</script>

<div class="w-full flex-center whitespace-nowrap mb-4">
  <Label label={title} {params} />
  <div class="ml-4" class:line={line} ></div>
</div>

<style lang="scss">
  .line {
    position: relative;
    width: 100%;
    height: 1px;
    background-color: var(--theme-chat-divider);
  }
</style>
