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
  import core, { Association, Class, Doc, Ref } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { IntlString } from '@hcengineering/platform'

  export let value: Association

  const client = getClient()
  const hierarchy = client.getHierarchy()
  function getClassLabel (_class: Ref<Class<Doc>>): IntlString {
    try {
      const _classLabel = hierarchy.getClass(_class)
      return _classLabel.label
    } catch (err) {
      console.error(err)
      return core.string.Class
    }
  }
</script>

<div class="hulyTableAttr-content__row-label cursor-pointer">
  {value.nameA} (<Label label={getClassLabel(value.classA)} />) - {value.nameB} (<Label
    label={getClassLabel(value.classB)}
  />)
</div>
