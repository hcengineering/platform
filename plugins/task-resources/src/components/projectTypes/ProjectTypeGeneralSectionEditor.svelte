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
  import { type ProjectType, type ProjectTypeDescriptor } from '@hcengineering/task'
  import { SpaceTypeGeneralSectionEditor } from '@hcengineering/setting-resources'
  import { Component } from '@hcengineering/ui'

  export let type: ProjectType | undefined
  export let descriptor: ProjectTypeDescriptor | undefined
</script>

<SpaceTypeGeneralSectionEditor {type} {descriptor}>
  <svelte:fragment slot="extra">
    {#if descriptor?.editor}
      <Component is={descriptor.editor} props={{ type }} />
    {/if}
  </svelte:fragment>
</SpaceTypeGeneralSectionEditor>
