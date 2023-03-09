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
  import type { IntlString } from '@hcengineering/platform'
  import { Label } from '@hcengineering/ui'

  export let title: IntlString
  export let line: boolean = false
  export let params: any = undefined
  export let reverse: boolean = false
  export let isNew: boolean = false
</script>

<div class="w-full text-sm flex-center whitespace-nowrap" class:flex-reverse={reverse} class:new={isNew}>
  <div class:ml-8={!reverse} class:mr-4={reverse}><Label label={title} {params} /></div>
  <div class:ml-4={!reverse} class:mr-4={reverse} class:line />
</div>

<style lang="scss">
  .line {
    position: relative;
    width: 100%;
    height: 1px;
    background-color: var(--divider-color);
  }
  .new {
    .line {
      background-color: var(--highlight-red);
    }
    color: var(--highlight-red);
  }
</style>
