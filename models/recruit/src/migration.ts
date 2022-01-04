//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Person } from '@anticrm/contact'
import core, { AttachedDoc, Class, Doc, DOMAIN_TX, MixinData, Ref, TxCollectionCUD, TxCreateDoc, TxMixin, TxUpdateDoc } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@anticrm/model'
import contact, { DOMAIN_CONTACT } from '@anticrm/model-contact'
import recruit, { Candidate } from '@anticrm/recruit'

function toCandidateData (c: Pick<Candidate, 'onsite'|'title'|'remote'|'source'>): MixinData<Person, Candidate> {
  const result: MixinData<Person, Candidate> = {
    onsite: c.onsite,
    title: c.title,
    remote: c.remote,
    source: c.source
  }
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(result).forEach(key => (result as any)[key] === undefined && delete (result as any)[key])
  return result
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Recruit: Migrate ${msg} ${result.updated}`)
  }
}
export const recruitOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // Move all candidates to mixins.
    await client.update(DOMAIN_CONTACT, {
      _class: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      $rename: {
        title: `${recruit.mixin.Candidate}.title`,
        applications: `${recruit.mixin.Candidate}.applications`,
        remote: `${recruit.mixin.Candidate}.remote`,
        source: `${recruit.mixin.Candidate}.source`,
        onsite: `${recruit.mixin.Candidate}.onsite`
      }
    })

    await client.update(DOMAIN_CONTACT, {
      _class: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      _class: contact.class.Person
    })

    // Migrate Create operations.
    await client.update(DOMAIN_TX, {
      _class: core.class.TxCreateDoc,
      objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      // objectClass: contact.class.Person,
      $rename: {
        'attributes.title': `attributes.${recruit.mixin.Candidate}.title`,
        'attributes.applications': `attributes.${recruit.mixin.Candidate}.applications`,
        'attributes.remote': `attributes.${recruit.mixin.Candidate}.remote`,
        'attributes.onsite': `attributes.${recruit.mixin.Candidate}.onsite`,
        'attributes.source': `attributes.${recruit.mixin.Candidate}.source`
      }
    })

    await migrateCreateCandidateToPersonAndMixin(client)

    // Migrate update operations.
    await client.update(DOMAIN_TX, {
      _class: core.class.TxUpdateDoc,
      objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      $rename: {
        'operations.title': `operations.${recruit.mixin.Candidate}.title`,
        'operations.applications': `operations.${recruit.mixin.Candidate}.applications`,
        'operations.remote': `operations.${recruit.mixin.Candidate}.remote`,
        'operations.onsite': `operations.${recruit.mixin.Candidate}.onsite`,
        'operations.source': `operations.${recruit.mixin.Candidate}.source`
      }
    })
    await migrateUpdateCandidateToPersonAndMixin(client)

    await migrateTxCollectionCandidateToPerson(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
async function migrateUpdateCandidateToPersonAndMixin (client: MigrationClient): Promise<void> {
  const updateCandidates = await client.find(DOMAIN_TX, {
    _class: core.class.TxUpdateDoc,
    objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>,
    [`operations.${recruit.mixin.Candidate}`]: { $exists: true }
  }) as TxUpdateDoc<Candidate>[]
  console.log('Processing update candidate operations:', updateCandidates.length)
  for (const c of updateCandidates) {
    const mixinOp: TxMixin<Person, Candidate> = {
      _class: core.class.TxMixin,
      _id: (c._id + '.m') as Ref<TxMixin<Person, Candidate>>,
      objectId: c.objectId,
      objectClass: contact.class.Person,
      mixin: recruit.mixin.Candidate,
      attributes: toCandidateData((c.operations as any)[recruit.mixin.Candidate] as unknown as Candidate),
      objectSpace: c.objectSpace,
      modifiedBy: c.modifiedBy,
      modifiedOn: c.modifiedOn,
      space: c.space
    }
    if (Object.keys(mixinOp.attributes).length > 0) {
      try {
        await client.create(DOMAIN_TX, mixinOp)
      } catch (ex) {
        // Ignore if existing
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (c.operations as any)[recruit.mixin.Candidate]

    if (Object.keys(c.operations).length === 0) {
      // Delete existing transaction, since there is nothing to change inside.
      await client.delete(DOMAIN_TX, c._id)
    } else {
      await client.update(DOMAIN_TX, { _id: c._id }, {
        $set: { objectClass: contact.class.Person },
        $unset: { [`operations.${recruit.mixin.Candidate}`]: '' }
      })
    }
  }
}
async function migrateTxCollectionCandidateToPerson (client: MigrationClient): Promise<void> {
  const collectionCandidates = await client.find(DOMAIN_TX, {
    _class: core.class.TxCollectionCUD,
    objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
  }) as TxCollectionCUD<Candidate, AttachedDoc>[]
  console.log('Processing collection candidate operations:', collectionCandidates.length)

  for (const c of collectionCandidates) {
    if (c.tx.objectClass === recruit.class.Applicant) {
      await client.update(DOMAIN_TX, { _id: c._id }, {
        objectClass: recruit.mixin.Candidate
      })
    } else {
      await client.update(DOMAIN_TX, { _id: c._id }, {
        objectClass: contact.class.Person
      })
    }
  }
}

async function migrateCreateCandidateToPersonAndMixin (client: MigrationClient): Promise<void> {
  const createCandidates = await client.find(DOMAIN_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>,
    [`attributes.${recruit.mixin.Candidate}`]: { $exists: true }
  }) as TxCreateDoc<Candidate>[]
  console.log('Processing create candidate operations:', createCandidates.length)
  for (const c of createCandidates) {
    const mixinOp: TxMixin<Person, Candidate> = {
      _class: core.class.TxMixin,
      _id: (c._id + '.m') as Ref<TxMixin<Person, Candidate>>,
      objectId: c.objectId,
      objectClass: contact.class.Person,
      mixin: recruit.mixin.Candidate,
      attributes: toCandidateData((c.attributes as any)[recruit.mixin.Candidate] as unknown as Candidate),
      objectSpace: c.objectSpace,
      modifiedBy: c.modifiedBy,
      modifiedOn: c.modifiedOn,
      space: c.space
    }
    if (Object.keys(mixinOp.attributes).length > 0) {
      try {
        await client.create(DOMAIN_TX, mixinOp)
      } catch (ex) {
        // Ignore if existing
      }
    }

    await client.update(DOMAIN_TX, { _id: c._id }, {
      $set: { objectClass: contact.class.Person },
      $unset: { [`attributes.${recruit.mixin.Candidate}`]: '' }
    })
  }
}
