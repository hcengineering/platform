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

<div class="association-row cursor-pointer">
  <span class="association-name">{value.nameA}</span>
  <span class="association-class">(<Label label={getClassLabel(value.classA)} />)</span>
  <span class="association-separator">↔</span>
  <span class="association-name">{value.nameB}</span>
  <span class="association-class">(<Label label={getClassLabel(value.classB)} />)</span>
</div>

<style>
  .association-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0;
  }

  .association-name {
    font-weight: 500;
    color: #2c3e50;
  }

  .association-class {
    color: #5d6b82;
  }

  .association-separator {
    margin: 0 0.25rem;
    color: #7f8c8d;
  }
</style>
