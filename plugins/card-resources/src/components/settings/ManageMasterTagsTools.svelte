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
  import { ButtonIcon, getCurrentResolvedLocation, IconAdd, navigate, showPopup } from '@hcengineering/ui'
  import CreateTag from '../CreateTag.svelte'
  import card from '../../plugin'
  import { clearSettingsStore } from '@hcengineering/setting-resources'

  function handleAdd (): void {
    showPopup(
      CreateTag,
      {
        parent: undefined,
        _class: card.class.MasterTag
      },
      undefined,
      (res) => {
        if (res != null) {
          clearSettingsStore()
          const loc = getCurrentResolvedLocation()
          loc.path[3] = 'types'
          loc.path[4] = res
          loc.path.length = 5
          navigate(loc)
        }
      }
    )
  }
</script>

<ButtonIcon id={'new-master-tag'} icon={IconAdd} kind={'tertiary'} size={'extra-small'} on:click={handleAdd} />
