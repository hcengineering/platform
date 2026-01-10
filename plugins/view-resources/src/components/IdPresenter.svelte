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
  import core, { AnyAttribute, Doc, VersionableDoc } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { LabelAndProps, tooltip } from '@hcengineering/ui'
  import DocNavLink from './DocNavLink.svelte'

  export let value: string | undefined
  export let attribute: AnyAttribute
  export let object: Doc | undefined = undefined

  $: tooltipParams = getTooltip(value)

  const client = getClient()
  const h = client.getHierarchy()

  function getTooltip (value: string | undefined): LabelAndProps | undefined {
    if (value === undefined) return
    return {
      label: getEmbeddedLabel(value)
    }
  }

  const query = createQuery()
  $: if (value !== undefined && object === undefined) {
    query.query(attribute.attributeOf, { [attribute.name]: value }, (res) => {
      if (res.length === 0) {
        object = undefined
        return
      }
      if (h.classHierarchyMixin(attribute.attributeOf, core.mixin.VersionableClass)?.enabled === true) {
        object = res.find((p) => (p as VersionableDoc).isLatest === true) ?? res[0]
      } else {
        object = res[0]
      }
    })
  } else {
    query.unsubscribe()
  }
</script>

{#if object !== undefined}
  <DocNavLink {object} shrink={0}>
    <span class="overflow-label cursor-pointer px-3">
      {value ?? ''}
    </span>
  </DocNavLink>
{:else}
  <span class="overflow-label px-3" use:tooltip={tooltipParams}>
    {value ?? ''}
  </span>
{/if}
