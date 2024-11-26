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
  import { BreadcrumbsElement } from '@hcengineering/presentation'
  import { ScrollerBar } from '@hcengineering/ui'

  import {type TestRunStats} from '../../testRunUtils'

  export let value: TestRunStats

  let divScroll: HTMLElement

</script>

<ScrollerBar gap="none" bind:scroller={divScroll}>
  <BreadcrumbsElement
    noGap
    label={value.untested.toString()}
    position={'start'}
    color={'#4CA6EE'}
    fontColor="white"
    title="Untested"
    selected
    on:click={(ev) => {
      ev.stopPropagation()
      // if (item._id !== state) selectItem(ev, item)
    }}
  />
  <BreadcrumbsElement
    label={value.blocked.toString()}
    noGap
    position={'middle'}
    color={'#D27540'}
    selected
    fontColor="white"
    title="Failed"
    on:click={(ev) => {
      ev.stopPropagation()
      // if (item._id !== state) selectItem(ev, item)
    }}
  />
  <BreadcrumbsElement
    label={value.failed.toString()}
    noGap
    position={'middle'}
    color={'#D15045'}
    selected
    fontColor="white"
    title="Failed"
    on:click={(ev) => {
      ev.stopPropagation()
      // if (item._id !== state) selectItem(ev, item)
    }}
  />
  <BreadcrumbsElement
    noGap
    label={value.completed.toString()}
    position={'end'}
    color={'#46A44F'}
    fontColor="white"
    title="Passed"
    selected
    on:click={(ev) => {
      ev.stopPropagation()
      // if (item._id !== state) selectItem(ev, item)
    }}
  />
</ScrollerBar>
