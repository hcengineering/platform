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
  import { TestCase, TestResult } from '@hcengineering/test-management'
  import { WithLookup } from '@hcengineering/core'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink, ObjectMention } from '@hcengineering/view-resources'

  import testManagement from '../../plugin'

  export let value: WithLookup<TestResult> | undefined
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let shouldShowAvatar = true

  let testCase: TestCase | undefined = undefined
  $: testCase = value?.$lookup?.testCase as TestCase | undefined
  $: title = testCase?.name ?? value.name
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} {accent} {noUnderline} />
  {:else}
    <DocNavLink object={value} {disabled} {accent} {noUnderline}>
      <div class="flex-presenter" use:tooltip={{ label: testManagement.string.TestResult }}>
        {#if shouldShowAvatar}
          <div class="icon">
            <Icon icon={testManagement.icon.TestResult} size="small" />
          </div>
        {/if}
        <span {title} class="overflow-label label" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
          {title}
        </span>
      </div>
    </DocNavLink>
  {/if}
{/if}
