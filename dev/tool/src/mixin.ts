//
// Copyright © 2023 Hardcore Engineering Inc.
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
  AnyAttribute,
  BackupClient,
  Class,
  ClassifierKind,
  Client as CoreClient,
  Doc,
  Domain,
  Hierarchy,
  Obj,
  Ref,
  SortingOrder,
  WorkspaceId
} from '@hcengineering/core'
import { getWorkspaceDB } from '@hcengineering/mongo'
import { connect } from '@hcengineering/server-tool'
import { MongoClient } from 'mongodb'

export const DOMAIN_COMMENT = 'comment' as Domain

interface PropertyInfo {
  name: string
  cValue: any
  mValue: any
  cModifiedOn: number
  mModifiedOn: number
}

interface ObjectPropertyInfo {
  doc: Ref<Doc>
  properties: PropertyInfo[]
}

export async function showMixinForeignAttributes (
  workspaceId: WorkspaceId,
  transactorUrl: string,
  cmd: { detail: boolean, mixin: string, property: string }
): Promise<void> {
  console.log(`Running mixin attribute check with ${JSON.stringify(cmd)}`)

  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const result = await getMixinWithForeignProperties(connection, cmd.mixin, cmd.property)

    console.log(`Found ${result.size} mixin(s)\n`)

    // print summary
    for (const [mixin, objects] of result) {
      const properties = [...new Set(objects.map((o) => o.properties.map((p) => p.name)).flat())].sort()

      console.log('*', mixin)
      console.log('  -', properties.join(', '))
    }

    // print details
    if (cmd.detail) {
      for (const [mixin, objects] of result) {
        console.log(mixin, '\n', JSON.stringify(objects, undefined, 2), '\n')
      }
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

export async function fixMixinForeignAttributes (
  mongoUrl: string,
  workspaceId: WorkspaceId,
  transactorUrl: string,
  cmd: { mixin: string, property: string }
): Promise<void> {
  console.log(`Running mixin attribute check with ${JSON.stringify(cmd)}`)

  const connection = (await connect(transactorUrl, workspaceId, undefined, {
    mode: 'backup'
  })) as unknown as CoreClient & BackupClient
  try {
    const result = await getMixinWithForeignProperties(connection, cmd.mixin, cmd.property)

    console.log(`Found ${result.size} mixin(s)\n`)
    for (const [mixin, objects] of result) {
      console.log(mixin, '\n', JSON.stringify(objects, undefined, 2), '\n')
    }

    if (result.size > 0) {
      const client = new MongoClient(mongoUrl)
      try {
        await client.connect()
        const db = getWorkspaceDB(client, workspaceId)

        for (const [mixin, objects] of result) {
          console.log('fixing', mixin)

          let domain: Domain | undefined
          try {
            domain = connection.getHierarchy().getDomain(mixin)
          } catch (err: any) {
            console.error('failed to get domain for', mixin)
          }
          if (domain === undefined) continue

          for (const { doc, properties } of objects) {
            for (const property of properties) {
              console.log('fixing', mixin, doc, property.name)

              const mixinPropertyName = `${mixin}.${property.name}`
              const propertyName = property.name

              if (property.mModifiedOn > property.cModifiedOn) {
                console.log(`- renaming: ${mixinPropertyName} -> ${propertyName}`)
                await db.collection(domain).updateOne({ _id: doc }, { $rename: { [mixinPropertyName]: propertyName } })
              } else {
                console.log(`- removing: ${mixinPropertyName}`)
                await db.collection(domain).updateOne({ _id: doc }, { $unset: { [mixinPropertyName]: '' } })
              }
            }
          }
        }
      } finally {
        await client.close()
      }
    }
  } catch (err: any) {
    console.trace(err)
  } finally {
    await connection.close()
  }
}

/**
 * Returns properties that present in the mixin but not declared as the mixin attribute.
 * If the property is not an attribute, it won't be returned as 'foreign'
 * @param doc
 * @param mixin
 * @param attributes
 * @returns array of property names
 */
function getForeignProperties (
  doc: Doc,
  mixin: Ref<Class<Doc>>,
  attributes: Map<string, AnyAttribute>,
  attribute: string
): string[] {
  if (!(mixin in doc)) return []

  const mixinAttr = (doc as any)[mixin]
  return Object.entries(mixinAttr)
    .filter(([key]) => attribute === '' || key === attribute)
    .filter(([key]) => (attributes.has(key) ? attributes.get(key)?.attributeOf !== mixin : false))
    .map(([key]) => key)
}

async function getMixinWithForeignProperties (
  connection: CoreClient,
  mixin: string,
  attribute: string
): Promise<Map<Ref<Class<Doc>>, ObjectPropertyInfo[]>> {
  const hierarchy = connection.getHierarchy()

  const mixins = await connection.findAll(core.class.Class, {
    kind: ClassifierKind.MIXIN,
    ...(mixin !== '' ? { _id: mixin as Ref<Class<Obj>> } : {})
  })

  const result: Map<Ref<Class<Doc>>, ObjectPropertyInfo[]> = new Map()

  for (const [index, mixin] of mixins.entries()) {
    console.log(`(${index + 1}/${mixins.length}) Processing ${mixin._id} ...`)

    const attributes = hierarchy.getAllAttributes(mixin._id)

    try {
      // Find objects that have mixin attributes
      const objects = await connection.findAll(mixin._id, {
        [mixin._id]: { $exists: true }
      })

      for (const doc of objects) {
        const foreignProperties = getForeignProperties(doc, mixin._id, attributes, attribute)

        if (foreignProperties.length > 0) {
          const _doc = Hierarchy.toDoc(doc)

          const properties: PropertyInfo[] = []
          for (const property of foreignProperties) {
            const cValue = (_doc as any)[property]
            const mValue = (_doc as any)[mixin._id]?.[property]

            // check class and mixin transactions for the property
            const updateDocTx = await connection.findAll(
              core.class.TxUpdateDoc,
              { objectId: doc._id, [`operations.${property}`]: { $exists: true } },
              { limit: 1, sort: { modifiedOn: SortingOrder.Descending } }
            )

            const mixinTx = await connection.findAll(
              core.class.TxMixin,
              { objectId: doc._id, [`attributes.${property}`]: { $exists: true } },
              { limit: 1, sort: { modifiedOn: SortingOrder.Descending } }
            )

            const collectionTx = await connection.findAll(
              core.class.TxCollectionCUD,
              {
                'tx._class': core.class.TxUpdateDoc,
                'tx.objectId': doc._id,
                [`tx.operations.${property}`]: { $exists: true }
              },
              { limit: 1, sort: { modifiedOn: SortingOrder.Descending } }
            )

            const cModifiedOn = Math.max(updateDocTx[0]?.modifiedOn ?? 0, collectionTx[0]?.modifiedOn ?? 0)
            const mModifiedOn = mixinTx[0]?.modifiedOn ?? 0

            properties.push({ name: property, cValue, mValue, cModifiedOn, mModifiedOn })
          }

          result.set(mixin._id, [...(result.get(mixin._id) ?? []), { doc: doc._id, properties }])
        }
      }
      const objectsCount = result.get(mixin._id)?.length ?? 0
      console.log(`(${index + 1}/${mixins.length}) ... processed ${mixin._id} done, found ${objectsCount} objects`)
    } catch (err: any) {
      console.error(err)
    }
  }

  return result
}
