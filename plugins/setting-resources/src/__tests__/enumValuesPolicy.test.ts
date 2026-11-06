//
// Copyright © 2026 Hardcore Engineering Inc.
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

import core, {
  type AnyAttribute,
  type ArrOf,
  type Doc,
  type Enum,
  type EnumOf,
  Hierarchy,
  type Type,
  ClassifierKind,
  ModelDb,
  type Ref,
  TxFactory
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import { canChangeEnumValues } from '../enumValuesPolicy'
import { EnumValuesDraft } from '../enumValuesUtils'

function hierarchyFixture (): Hierarchy {
  const hierarchy = new Hierarchy()
  const factory = new TxFactory(core.account.System)
  for (const ref of [
    core.class.Obj,
    core.class.Doc,
    core.class.Attribute,
    core.class.Enum,
    core.class.Type,
    core.class.EnumOf,
    core.class.ArrOf
  ]) {
    hierarchy.tx(
      factory.createTxCreateDoc(
        core.class.Class,
        core.space.Model,
        {
          label: 'Test' as IntlString,
          kind: ClassifierKind.CLASS,
          extends: ref === core.class.Obj ? undefined : core.class.Obj
        },
        ref
      )
    )
  }
  return hierarchy
}

function enumFixture (): Enum {
  return {
    _id: 'enum' as Enum['_id'],
    _class: core.class.Enum,
    space: core.space.Model,
    modifiedBy: core.account.System,
    modifiedOn: 0,
    name: 'Example',
    enumValues: ['Old', 'Other']
  }
}

function fieldFixture (type: Type<unknown>, defaultValue: string | string[] | undefined): AnyAttribute {
  return {
    _id: 'field' as AnyAttribute['_id'],
    _class: core.class.Attribute,
    space: core.space.Model,
    modifiedBy: core.account.System,
    modifiedOn: 0,
    attributeOf: core.class.Doc,
    name: 'choice',
    label: 'Choice' as IntlString,
    type,
    defaultValue,
    hidden: true
  }
}

describe('canChangeEnumValues', () => {
  // Synthetic model definitions include hidden fields and defaults. No permission-
  // filtered object query is used to infer that a particular option is unused.
  it.each(['scalar', 'array', 'scalar default', 'array default'])(
    'blocks renames and removals for a referenced %s field before client.update',
    async (kind) => {
      const hierarchy = hierarchyFixture()
      const value = enumFixture()
      const scalar: EnumOf = { _class: core.class.EnumOf, label: 'Select' as IntlString, of: value._id }
      const array: ArrOf<string> = { _class: core.class.ArrOf, label: 'Array' as IntlString, of: scalar }
      const isArray = kind.startsWith('array')
      const defaultValue = kind.endsWith('default') ? (isArray ? ['Old'] : 'Old') : undefined
      const field = fieldFixture(isArray ? array : scalar, defaultValue)
      const canSave = (values: string[]): boolean => canChangeEnumValues(value, values, [field], hierarchy)
      const update = jest.fn().mockResolvedValue(undefined)
      const draft = new EnumValuesDraft()
      draft.sync(value.enumValues)
      draft.beginEdit()
      draft.values[0] = 'New'
      expect(await draft.save({ update }, value, true, canSave)).toEqual({ error: 'referenced' })
      expect(draft.values).toEqual(['Old', 'Other'])
      expect(update).not.toHaveBeenCalled()
      expect(canSave(['Other'])).toBe(false)
      expect(canSave(['Other', 'Old', 'New'])).toBe(true)
      expect(field.defaultValue).toEqual(defaultValue)
    }
  )

  it('allows unused enums and ignores fields referencing a different enum', () => {
    const value = enumFixture()
    const hierarchy = hierarchyFixture()
    const other: EnumOf = {
      _class: core.class.EnumOf,
      label: 'Select' as IntlString,
      of: 'another-enum' as Enum['_id']
    }
    expect(canChangeEnumValues(value, ['New', 'Other'], [], hierarchy)).toBe(true)
    expect(canChangeEnumValues(value, ['New', 'Other'], [fieldFixture(other, 'Old')], hierarchy)).toBe(true)
  })

  it('protects nested arrays and subclasses of enum types', () => {
    const value = enumFixture()
    const hierarchy = hierarchyFixture()
    const subclass = 'test:class:EnumOf' as EnumOf['_class']
    const factory = new TxFactory(core.account.System)
    hierarchy.tx(
      factory.createTxCreateDoc(
        core.class.Class,
        core.space.Model,
        { label: 'Select' as IntlString, kind: ClassifierKind.CLASS, extends: core.class.EnumOf },
        subclass
      )
    )
    const scalar: EnumOf = { _class: subclass, label: 'Select' as IntlString, of: value._id }
    const array: ArrOf<string> = { _class: core.class.ArrOf, label: 'Array' as IntlString, of: scalar }
    const nested: ArrOf<string[]> = { _class: core.class.ArrOf, label: 'Array' as IntlString, of: array }
    expect(canChangeEnumValues(value, ['New', 'Other'], [fieldFixture(nested, undefined)], hierarchy)).toBe(false)
  })

  it('retains the choices stored by objects and defaults in every accepted save payload', async () => {
    const value = enumFixture()
    const hierarchy = hierarchyFixture()
    const scalar: EnumOf = { _class: core.class.EnumOf, label: 'Select' as IntlString, of: value._id }
    const array: ArrOf<string> = { _class: core.class.ArrOf, label: 'Array' as IntlString, of: scalar }
    const scalarDefault = 'Old'
    const arrayDefault = ['Old', 'Other']
    const fields: AnyAttribute[] = [
      { ...fieldFixture(scalar, scalarDefault), _id: 'scalar-field' as AnyAttribute['_id'], name: 'scalar' },
      { ...fieldFixture(array, arrayDefault), _id: 'array-field' as AnyAttribute['_id'], name: 'array' }
    ]
    type StoredObject = Doc & { scalar: string, array: string[] }
    const object: StoredObject = {
      _id: 'object' as Ref<StoredObject>,
      _class: core.class.Doc,
      space: 'private-space' as Doc['space'],
      modifiedBy: core.account.System,
      modifiedOn: 0,
      scalar: 'Old',
      array: ['Old', 'Other']
    }
    const model = new ModelDb(hierarchy)
    for (const field of fields) model.addDoc(field)
    model.addDoc(value)
    // Synthetic workspace storage is separate from the complete model. Even an
    // object in a space unavailable to this editor must keep its choices.
    const objects = new ModelDb(hierarchy)
    objects.addDoc(object)
    const canSave = (values: string[]): boolean =>
      canChangeEnumValues(value, values, model.findAllSync(core.class.Attribute, {}), hierarchy)
    const update = jest.fn<Promise<void>, [Enum, { enumValues: string[] }]>().mockResolvedValue(undefined)
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    for (const edited of [['New', 'Other'], ['Other']]) {
      draft.beginEdit()
      draft.values = edited
      expect(await draft.save({ update }, value, true, canSave)).toEqual({ error: 'referenced' })
    }
    expect(update).not.toHaveBeenCalled()
    expect(value.enumValues).toEqual(['Old', 'Other'])
    expect(objects.findObject(object._id)).toEqual(object)

    draft.beginEdit()
    draft.values = ['Other', 'Old', 'Added']
    await draft.save({ update }, value, false, canSave)
    expect(update).toHaveBeenCalledWith(value, { enumValues: ['Other', 'Old', 'Added'] })
    const saved = update.mock.calls[0]?.[1].enumValues
    for (const selected of [object.scalar, ...object.array, scalarDefault, ...arrayDefault]) {
      expect(saved).toContain(selected)
    }
    expect(fields[0].defaultValue).toBe(scalarDefault)
    expect(fields[1].defaultValue).toEqual(arrayDefault)
  })
})
