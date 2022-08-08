//
// Copyright © 2022 Hardcore Engineering Inc.
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
//

import core, { AnyAttribute, Data, Enum, EnumOf, Ref, TxOperations } from '@anticrm/core'
import lead from '@anticrm/lead'
import { getEmbeddedLabel } from '@anticrm/platform'
import { FieldType } from './types'

export async function updateClasses (
  client: TxOperations,
  records: any[],
  fieldMapping: Record<string, FieldType>
): Promise<void> {
  const allAttrs = client.getHierarchy().getAllAttributes(lead.mixin.Customer)
  for (const [k, v] of Object.entries(fieldMapping)) {
    if (v.type === undefined) {
      continue
    }
    let attr = allAttrs.get(v.name)
    if (attr === undefined) {
      try {
        if (!client.getHierarchy().isDerived(v.type, core.class.Type)) {
          // Skip channels mapping
          continue
        }
      } catch (any) {
        continue
      }
      // Create attr
      const data: Data<AnyAttribute> = {
        attributeOf: lead.mixin.Customer,
        name: v.name,
        label: getEmbeddedLabel(k),
        isCustom: true,
        type: {
          _class: v.type,
          label: v.label ?? core.string.String
        }
      }
      if (client.getHierarchy().isDerived(v.type, core.class.EnumOf)) {
        ;(data.type as EnumOf).of = `lead:class:${(v as any).enumName as string}` as Ref<Enum>
      }
      const attrId = (lead.mixin.Customer + '.' + v.name) as Ref<AnyAttribute>
      await client.createDoc(core.class.Attribute, core.space.Model, data, attrId)
      attr = await client.findOne(core.class.Attribute, { _id: attrId })
    }
    // Check update Enum/Values
    if (client.getHierarchy().isDerived(v.type, core.class.EnumOf)) {
      const enumName = (v as any).enumName as string
      const enumId = `lead:class:${enumName}` as Ref<Enum>
      let enumClass = await client.findOne(core.class.Enum, { _id: enumId })
      if (enumClass === undefined) {
        await client.createDoc(
          core.class.Enum,
          core.space.Model,
          {
            name: enumName,
            enumValues: []
          },
          enumId
        )
        enumClass = client.getModel().getObject(enumId)
      }
      // Check values
      const mapv = (v?: string): string =>
        (v?.toString() ?? '').trim().length === 0 ? 'не задано' : (v?.toString() ?? '').trim()
      const values = records
        .map((it) => it[v.fName ?? k])
        .map(mapv)
        .filter((it, idx, arr) => arr.indexOf(it) === idx)
      for (const v of values) {
        if (!enumClass.enumValues.includes(v)) {
          await client.update(enumClass, {
            $push: { enumValues: v }
          })
        }
      }
    }
  }
}
