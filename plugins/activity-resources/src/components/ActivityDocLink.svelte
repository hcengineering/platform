<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Doc } from '@hcengineering/core'
  import { type AnyComponent, Label } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { IntlString } from '@hcengineering/platform'

  export let object: Doc
  export let title: string = ''
  export let panelComponent: AnyComponent | undefined
  export let preposition: IntlString | undefined = undefined
</script>

{#if preposition}
  <span class="text-sm lower"><Label label={preposition} /></span>
{/if}
<span class="text-sm" {title}>
  <DocNavLink {object} component={panelComponent} shrink={0}>
    <span class="overflow-label select-text" class:withoutMargin={!preposition}>{title}</span>
  </DocNavLink>
</span>

<style lang="scss">
  span {
    margin-left: 0.25rem;
    font-weight: 400;
    line-height: 1.25rem;

    &.withoutMargin {
      margin: 0;
    }
  }
</style>
