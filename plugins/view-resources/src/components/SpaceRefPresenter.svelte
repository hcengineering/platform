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
  import core, { Ref, Space } from '@hcengineering/core'
  import { ObjectPresenter } from '..'

  export let value: Ref<Space>
  export let inline: boolean = false
  export let accent: boolean = false
  export let shouldShowAvatar: boolean = true
  export let noUnderline: boolean = false
  export let disabled: boolean = false
  export let shouldShowName: boolean = true
  export let shrink: number = 0
</script>

<ObjectPresenter
  objectId={value}
  _class={core.class.Space}
  {shouldShowAvatar}
  {shouldShowName}
  {disabled}
  {inline}
  {noUnderline}
  {shrink}
  {accent}
  on:accent-color
/>
