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
  import { ActivityMessagePreviewType, ActivityReference } from '@hcengineering/activity'

  import BaseMessagePreview from '../activity-message/BaseMessagePreview.svelte'
  import { Action } from '@hcengineering/ui'

  export let value: ActivityReference
  export let readonly = false
  export let type: ActivityMessagePreviewType = 'full'
  export let actions: Action[] = []
</script>

<BaseMessagePreview text={value.message} message={value} {type} {readonly} {actions} on:click />
