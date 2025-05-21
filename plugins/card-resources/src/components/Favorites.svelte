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
  import card from '@hcengineering/card'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import view from '@hcengineering/view'
  import preference from '@hcengineering/preference'

  export let application: string
</script>

<SpecialView
  _class={card.class.FavoriteCard}
  icon={view.icon.Star}
  label={preference.string.Starred}
  defaultViewletDescriptor={view.viewlet.List}
  baseQuery={{ application }}
/>
