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
  import { Office, Room, RoomType } from '@hcengineering/love'
  import { BooleanEditor } from '@hcengineering/view-resources'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'

  export let object: Room | undefined
  export let value: RoomType | undefined
  export let onChange: (value: any) => void
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  $: booleanValue = value === RoomType.Video
  $: disabled = object === undefined || !('person' in object) || (object as Office).person !== getCurrentEmployee()

  function onValueChanged (newValue: any): void {
    onChange(newValue === true ? RoomType.Video : RoomType.Audio)
  }
</script>

<BooleanEditor
  {disabled}
  {kind}
  {size}
  {justify}
  {width}
  value={booleanValue}
  withoutUndefined={true}
  onChange={onValueChanged}
/>
