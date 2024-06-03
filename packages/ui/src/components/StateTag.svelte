<!--
//
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
//
-->
<script lang="ts">
  import type { IntlString } from '@hcengineering/platform'

  import Label from './Label.svelte'
  import { StateType } from '../types'

  type LabelString = $$Generic<IntlString>
  type LabelParams = LabelString extends IntlString<infer Params> ? Params : Record<string, any>

  export let type: StateType
  export let label: LabelString
  export let params: LabelParams = {} as unknown as LabelParams
</script>

<div
  class="root"
  class:ghost={type === StateType.Ghost}
  class:negative={type === StateType.Negative}
  class:positive={type === StateType.Positive}
  class:primary={type === StateType.Primary}
  class:regular={type === StateType.Regular}
>
  <Label {label} {params} />
</div>

<style lang="scss">
  .root {
    border: 1px solid transparent;
    border-radius: 0.25rem;
    display: flex;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1rem;
    padding: 0.125rem 0.5rem;
    width: max-content;

    &.ghost {
      background: var(--theme-state-ghost-background-color);
      border-color: var(--theme-state-ghost-border-color);
      color: var(--theme-state-ghost-color);
    }
    &.negative {
      background: var(--theme-state-negative-background-color);
      border-color: var(--theme-state-negative-border-color);
      color: var(--theme-state-negative-color);
    }
    &.positive {
      background: var(--theme-state-positive-background-color);
      border-color: var(--theme-state-positive-border-color);
      color: var(--theme-state-positive-color);
    }
    &.primary {
      background: var(--theme-state-primary-background-color);
      border-color: var(--theme-qms-primary-ghost-border-color);
      color: var(--theme-state-primary-color);
    }
    &.regular {
      background: var(--theme-state-regular-background-color);
      border-color: var(--theme-state-regular-border-color);
      color: var(--theme-state-regular-color);
    }
  }
</style>
