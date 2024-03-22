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
  import { Label } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import activity, { DocAttributeUpdates, DocUpdateMessageViewlet } from '@hcengineering/activity'

  import ChangeAttributesTemplate from './ChangeAttributesTemplate.svelte'

  export let viewlet: DocUpdateMessageViewlet | undefined
  export let attributeModel: AttributeModel
  export let values: DocAttributeUpdates['added']
  export let preview = false
</script>

<ChangeAttributesTemplate {viewlet} {attributeModel} {values} {preview}>
  <svelte:fragment slot="text">
    <Label label={activity.string.New} />
    <span class="lower"><Label label={attributeModel.label} />:</span>
  </svelte:fragment>
</ChangeAttributesTemplate>
