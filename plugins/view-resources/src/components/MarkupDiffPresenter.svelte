<!--
// Copyright © 2023 Anticrm Platform Contributors.
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
  import { AnyAttribute, Markup } from '@hcengineering/core'
  import { EmptyMarkup, MarkupNode, MarkupNodeType, markupToJSON } from '@hcengineering/text'
  import { MarkupDiffViewer } from '@hcengineering/text-editor-resources'
  import { ShowMore } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'

  export let value: Markup | undefined
  export let prevValue: Markup | undefined = undefined
  export let attribute: AnyAttribute | undefined = undefined

  export let showOnlyDiff: boolean = false

  $: content = markupToJSON(value ?? EmptyMarkup)
  $: comparedVersion = markupToJSON(prevValue ?? EmptyMarkup)

  function cleanup (node1: MarkupNode, node2: MarkupNode): MarkupNode[] {
    if (node1.type !== MarkupNodeType.doc || node2.type !== MarkupNodeType.doc) {
      return [node1, node2]
    }

    const content1 = node1.content ?? []
    const content2 = node2.content ?? []

    const newContent1: MarkupNode[] = []
    const newContent2: MarkupNode[] = []
    for (let i = 0; i < Math.max(content1.length, content2.length); i++) {
      if (!same(content1[i], content2[i])) {
        if (content1[i] !== undefined) {
          newContent1.push(content1[i])
        }
        if (content2[i] !== undefined) {
          newContent2.push(content2[i])
        }
      }
    }

    return [
      { ...node1, content: newContent1 },
      { ...node2, content: newContent2 }
    ]
  }

  function same (node1: MarkupNode | undefined, node2: MarkupNode | undefined): boolean {
    if (node1 === undefined && node2 === undefined) return true
    if (node1 === undefined || node2 === undefined) return false

    if (
      node1.type !== node2.type ||
      node1.text !== node2.text ||
      !deepEqual(node1.marks ?? [], node2.marks ?? []) ||
      !deepEqual(node1.attrs ?? {}, node2.attrs ?? {})
    ) {
      return false
    }

    const content1 = node1.content ?? []
    const content2 = node2.content ?? []
    if (content1.length !== content2.length) return false

    for (let i = 0; i < content1.length; i++) {
      if (!same(content1[i], content2[i])) return false
    }

    return true
  }

  $: if (showOnlyDiff) {
    ;[content, comparedVersion] = cleanup(content, comparedVersion)
  }
</script>

<ShowMore>
  {#key [value, prevValue]}
    <MarkupDiffViewer objectClass={attribute?.attributeOf} {content} {comparedVersion} />
  {/key}
</ShowMore>
