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
import core, { AttachedDoc, Class, Doc, DocumentQuery, DOMAIN_TX, MixinData, Ref, TxCollectionCUD, TxCreateDoc, TxMixin, TxOperations, TxUpdateDoc } from '@anticrm/core'
import { createOrUpdate, MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import { DOMAIN_ATTACHMENT } from '@anticrm/model-attachment'
import { DOMAIN_CALENDAR } from '@anticrm/model-calendar'
import { DOMAIN_COMMENT } from '@anticrm/model-chunter'
import contact, { DOMAIN_CONTACT } from '@anticrm/model-contact'
import tags, { DOMAIN_TAGS, TagCategory, TagElement } from '@anticrm/model-tags'
import { DOMAIN_TASK } from '@anticrm/model-task'
import { Candidate } from '@anticrm/recruit'
import { getCategories } from '@anticrm/skillset'
import { createReviewTemplates, createSequence } from './creation'
import recruit from './plugin'

function toCandidateData (c: Pick<Candidate, 'onsite'|'title'|'remote'|'source'> | undefined): MixinData<Person, Candidate> {
  if (c === undefined) {
    return {}
  }
  const result: MixinData<Person, Candidate> = {
    onsite: c.onsite,
    title: c.title,
    remote: c.remote,
    source: c.source
  }
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(result).forEach(key => (result as any)[key] == null && delete (result as any)[key])
  return result
}

function findTagCategory (title: string, categories: TagCategory[]): Ref<TagCategory> {
  for (const c of categories) {
    if (c.tags.findIndex((it) => it.toLowerCase() === title.toLowerCase()) !== -1) {
      return c._id
    }
  }
  return recruit.category.Other
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

    await client.update(DOMAIN_TASK, {
      attachedToClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      attachedToClass: recruit.mixin.Candidate
    })

    await client.update(DOMAIN_ATTACHMENT, {
      attachedToClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      attachedToClass: recruit.mixin.Candidate
    })

    await client.update(DOMAIN_ATTACHMENT, {
      attachedToClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      attachedToClass: recruit.mixin.Candidate
    })

    await client.update(DOMAIN_COMMENT, {
      attachedToClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      attachedToClass: recruit.mixin.Candidate
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

    await client.update(DOMAIN_TX, {
      _class: core.class.TxRemoveDoc,
      objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
    }, {
      objectClass: contact.class.Person
    })

    // Rename other
    const categories = await client.find(DOMAIN_TAGS, { _class: tags.class.TagCategory })
    const prefix = 'tags:category:Category'
    for (const c of categories) {
      if (c._id.startsWith(prefix) || c._id === 'tags:category:Other') {
        let newCID = c._id.replace(prefix, recruit.category.Category + '.') as Ref<TagCategory>
        if (c._id === 'tags:category:Other') {
          newCID = recruit.category.Other
        }
        await client.delete(DOMAIN_TAGS, c._id)
        try {
          await client.create(DOMAIN_TAGS, { ...c, _id: newCID, targetClass: recruit.mixin.Candidate })
        } catch (err: any) {
          // ignore
        }
        await client.update(DOMAIN_TAGS, { _class: tags.class.TagElement, category: c._id }, {
          category: newCID,
          targetClass: recruit.mixin.Candidate
        })
      }
    }

    // Migrate reviews

    await client.update(DOMAIN_TASK, {
      _class: recruit.class.Review
    }, {
      $rename: {
        startDate: 'date'
      }
    })

    await client.update(DOMAIN_TASK, {
      _class: recruit.class.Review,
      title: { $exists: false }
    }, {
      title: ''
    })

    await client.move(DOMAIN_TASK, { _class: recruit.class.Review }, DOMAIN_CALENDAR)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)

    await createSpace(tx)

    await migrateCompany(tx)

    await createOrUpdate(
      tx,
      tags.class.TagCategory,
      tags.space.Tags,
      {
        icon: tags.icon.Tags,
        label: 'Other',
        targetClass: recruit.mixin.Candidate,
        tags: [],
        default: true
      },
      recruit.category.Other
    )

    for (const c of getCategories()) {
      await createOrUpdate(
        tx,
        tags.class.TagCategory,
        tags.space.Tags,
        {
          icon: tags.icon.Tags,
          label: c.label,
          targetClass: recruit.mixin.Candidate,
          tags: c.skills,
          default: false
        },
        (recruit.category.Category + '.' + c.id) as Ref<TagCategory>
      )
    }

    const categories = await tx.findAll(tags.class.TagCategory, { targetClass: recruit.mixin.Candidate })
    // Find all existing TagElement and update category based on skillset
    const tagElements = await tx.findAll(tags.class.TagElement, { category: null } as unknown as DocumentQuery<TagElement>)
    for (const t of tagElements) {
      if (t.category == null) {
        const category = findTagCategory(t.title, categories)
        await tx.update(t, { category: category })
      }
    }

    await createReviewTemplates(tx)
    await createSequence(tx, recruit.class.Review)
    await createSequence(tx, recruit.class.Opinion)
  }
}

async function migrateCompany (tx: TxOperations): Promise<void> {
  await migrateVacancyCompany(tx)
}

async function migrateVacancyCompany (tx: TxOperations): Promise<void> {
  const vacancies = await tx.findAll(recruit.class.Vacancy, {})
  for (const vacancy of vacancies) {
    if (vacancy.company === undefined) continue
    const current = await tx.findOne(contact.class.Organization, { _id: vacancy.company })
    if (current !== undefined) continue
    const same = await tx.findOne(contact.class.Organization, { name: vacancy.company })
    if (same !== undefined) {
      await tx.update(vacancy, {
        company: same._id
      })
    } else {
      const id = await tx.createDoc(contact.class.Organization, contact.space.Contacts, {
        name: vacancy.company,
        city: ''
      })
      await tx.update(vacancy, {
        company: id
      })
    }
  }
}

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: recruit.space.CandidatesPublic
  })
  if (current === undefined) {
    await tx.createDoc(
      recruit.class.Candidates,
      core.space.Space,
      {
        name: 'public',
        description: 'Public Candidates',
        private: false,
        members: [],
        archived: false
      },
      recruit.space.CandidatesPublic
    )
  }
}

async function migrateUpdateCandidateToPersonAndMixin (client: MigrationClient): Promise<void> {
  const updateCandidates = await client.find(DOMAIN_TX, {
    _class: core.class.TxUpdateDoc,
    objectClass: 'recruit:class:Candidate' as Ref<Class<Doc>>
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
