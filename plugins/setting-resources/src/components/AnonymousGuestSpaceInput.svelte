<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Analytics } from '@hcengineering/analytics'
  import { readOnlyGuestAccountUuid, type ModulePermissionGroup, type Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { DropdownLabels, type DropdownTextItem } from '@hcengineering/ui'
  import settingsRes from '../plugin'

  export let group: ModulePermissionGroup
  export let disabled = false

  const client = getClient()

  let loading = true
  let saving = false
  let loadedGroupId: string | undefined
  let dropdownItems: DropdownTextItem[] = []
  let selectedKeys: string[] = []
  let persistedSelectedKeys: string[] = []
  let docById: Map<string, Space> = new Map<string, Space>()

  async function loadSpaces (): Promise<void> {
    if (group.spaceClass === undefined) {
      dropdownItems = []
      selectedKeys = []
      persistedSelectedKeys = []
      docById = new Map<string, Space>()
      loading = false
      return
    }

    loading = true
    try {
      const res = await client.findAll(group.spaceClass, { archived: false })
      docById = new Map(res.map((d) => [d._id, d as Space]))
      const docs = [...docById.values()]
      dropdownItems = docs.map((d) => ({ id: d._id, label: d.name })).sort((a, b) => a.label.localeCompare(b.label))
      selectedKeys = docs
        .filter((d) => (d.members ?? []).includes(readOnlyGuestAccountUuid))
        .map((d) => d._id)
        .sort()
      persistedSelectedKeys = [...selectedKeys]
    } catch (err) {
      Analytics.handleError(err as Error)
      dropdownItems = []
      selectedKeys = []
      persistedSelectedKeys = []
      docById = new Map<string, Space>()
    } finally {
      loading = false
    }
  }

  async function handleSelected (e: CustomEvent<string[]>): Promise<void> {
    const nextKeys = new Set(e.detail)
    const prevKeys = new Set(persistedSelectedKeys)
    const toEnable = [...nextKeys].filter((k) => !prevKeys.has(k))
    const toDisable = [...prevKeys].filter((k) => !nextKeys.has(k))

    if (toEnable.length === 0 && toDisable.length === 0) {
      return
    }

    saving = true
    try {
      const ops: Array<Promise<unknown>> = []
      for (const key of toEnable) {
        const doc = docById.get(key)
        if (doc === undefined) continue
        const members = [...(doc.members ?? [])]
        if (!members.includes(readOnlyGuestAccountUuid)) {
          members.push(readOnlyGuestAccountUuid)
          ops.push(client.diffUpdate(doc, { members }))
        }
      }
      for (const key of toDisable) {
        const doc = docById.get(key)
        if (doc === undefined) continue
        const members = (doc.members ?? []).filter((m) => m !== readOnlyGuestAccountUuid)
        ops.push(client.diffUpdate(doc, { members }))
      }

      await Promise.all(ops)
      selectedKeys = [...nextKeys].sort()
      persistedSelectedKeys = [...selectedKeys]
    } catch (err) {
      Analytics.handleError(err as Error)
      selectedKeys = [...persistedSelectedKeys]
      await loadSpaces()
    } finally {
      saving = false
    }
  }

  $: if (group._id !== loadedGroupId) {
    loadedGroupId = group._id
    void loadSpaces()
  }
</script>

<DropdownLabels
  multiselect
  autoSelect={false}
  items={dropdownItems}
  selected={[...(selectedKeys ?? [])]}
  label={settingsRes.string.GuestSelectSpaces}
  showDropdownIcon
  kind={'no-border'}
  size={'large'}
  width={'min(18rem, 100%)'}
  disabled={disabled || loading || saving || dropdownItems.length === 0}
  loading={saving}
  on:selected={handleSelected}
/>
