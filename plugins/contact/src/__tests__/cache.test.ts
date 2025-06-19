import core, { PersonId, Ref, SocialIdType, TxCreateDoc, TxUpdateDoc } from '@hcengineering/core'

import contact, { AvatarType, Person, SocialIdentity, SocialIdentityRef } from '..'
import ContactCache, { Change } from '../cache'

describe('ContactCache', () => {
  let cache: ContactCache
  let personId: PersonId
  let personRef: Ref<Person>
  let person: Person
  let socialId: SocialIdentity

  beforeEach(() => {
    ;(ContactCache as any)._instance = undefined
    cache = ContactCache.instance

    personId = 'personId1' as PersonId
    personRef = 'personRef1' as Ref<Person>
    socialId = {
      _id: personId as SocialIdentityRef,
      attachedTo: personRef,
      attachedToClass: contact.class.Person,
      _class: contact.class.SocialIdentity,
      space: contact.space.Contacts,
      modifiedOn: 0,
      createdBy: personId,
      modifiedBy: personId,
      type: SocialIdType.EMAIL,
      value: 'tester@huly.me',
      key: 'email:tester@huly.me',
      collection: 'socialIds'
    }

    person = {
      _id: personRef,
      _class: contact.class.Person,
      space: contact.space.Contacts,
      modifiedOn: 0,
      createdBy: personId,
      modifiedBy: personId,
      name: 'Test Person',
      avatarType: AvatarType.COLOR
    }
  })

  describe('fillCachesForPersonId', () => {
    it('should handle null social identity', () => {
      cache.fillCachesForPersonId(personId, null)

      expect(cache.personRefByPersonId.get(personId)).toBeNull()
      expect(cache.personByPersonId.get(personId)).toBeNull()
      expect(cache.socialIdByPersonId.get(personId)).toBeNull()
    })

    it('should fill caches with social identity without lookup', () => {
      cache.fillCachesForPersonId(personId, socialId)

      expect(cache.personRefByPersonId.get(personId)).toBe(personRef)
      expect(cache.personByPersonId.get(personId)).toBeNull()
      expect(cache.socialIdByPersonId.get(personId)).toBe(socialId)
    })

    it('should fill caches with social identity with person lookup', () => {
      const socialIdWLookup: SocialIdentity & { $lookup?: { attachedTo: Person } } = {
        ...socialId,
        $lookup: {
          attachedTo: person
        }
      }

      cache.fillCachesForPersonId(personId, socialIdWLookup)

      expect(cache.personRefByPersonId.get(personId)).toBe(personRef)
      expect(cache.personByPersonId.get(personId)).toBe(person)
      expect(cache.socialIdByPersonId.get(personId)).toBe(socialIdWLookup)
      expect(cache.personByRef.get(personRef)).toBe(person)
    })
  })

  describe('fillCachesForPersonRef', () => {
    const personId2 = 'personId2' as PersonId

    it('should handle null person', () => {
      cache.fillCachesForPersonRef(personRef, null)
      expect(cache.personByRef.get(personRef)).toBeNull()
    })

    it('should fill caches with person and social identities', () => {
      const personWLookup: Person & { $lookup?: { socialIds: SocialIdentity[] } } = {
        ...person,
        $lookup: {
          socialIds: [
            socialId,
            {
              _id: personId2 as SocialIdentityRef,
              attachedTo: personRef,
              _class: contact.class.SocialIdentity,
              space: contact.space.Contacts,
              modifiedOn: 0,
              createdBy: personId,
              modifiedBy: personId,
              attachedToClass: contact.class.Person,
              type: SocialIdType.EMAIL,
              value: 'tester2@huly.me',
              key: 'email:tester2@huly.me',
              collection: 'socialIds'
            }
          ]
        }
      }

      cache.fillCachesForPersonRef(personRef, personWLookup)

      expect(cache.personByRef.get(personRef)).toBe(personWLookup)
      expect(cache.personRefByPersonId.get(personId)).toBe(personRef)
      expect(cache.personRefByPersonId.get(personId2)).toBe(personRef)
      expect(cache.personByPersonId.get(personId)).toBe(personWLookup)
      expect(cache.personByPersonId.get(personId2)).toBe(personWLookup)
    })
  })

  describe('handleTx', () => {
    let changeListener: jest.Mock

    beforeEach(() => {
      changeListener = jest.fn()
      cache.addChangeListener(changeListener)
    })

    afterEach(() => {
      cache.removeChangeListener(changeListener)
    })

    it('should handle person creation', () => {
      const createTx: TxCreateDoc<Person> = {
        _id: 'tx1' as Ref<TxCreateDoc<Person>>,
        _class: core.class.TxCreateDoc,
        space: contact.space.Contacts,
        modifiedOn: 0,
        createdBy: personId,
        modifiedBy: personId,
        objectId: personRef,
        objectClass: contact.class.Person,
        objectSpace: contact.space.Contacts,
        attributes: {
          name: 'Tester',
          avatarType: AvatarType.COLOR
        }
      }

      // New person ref should be in cache
      cache.fillCachesForPersonRef(personRef, null)
      cache.handleTx([createTx])

      expect(changeListener).toHaveBeenCalledWith({
        personRef,
        personIds: []
      })
      expect(cache.personByRef.get(personRef)?.name).toBe('Tester')
    })

    it('should handle social identity creation', () => {
      const createTx: TxCreateDoc<SocialIdentity> = {
        _id: 'tx2' as Ref<TxCreateDoc<SocialIdentity>>,
        _class: core.class.TxCreateDoc,
        space: contact.space.Contacts,
        modifiedOn: 0,
        createdBy: personId,
        modifiedBy: personId,
        objectId: personId as SocialIdentityRef,
        objectClass: contact.class.SocialIdentity,
        objectSpace: contact.space.Contacts,
        attachedTo: personRef,
        attributes: {
          attachedTo: personRef,
          attachedToClass: contact.class.Person,
          type: SocialIdType.EMAIL,
          value: 'tester@huly.me',
          key: 'email:tester@huly.me',
          collection: 'socialIds'
        }
      }

      cache.fillCachesForPersonRef(personRef, {
        ...person,
        $lookup: {
          socialIds: [socialId]
        }
      })
      cache.handleTx([createTx])

      expect(changeListener).toHaveBeenCalledWith({
        personRef,
        personIds: [personId]
      })
    })

    it('should handle person update', () => {
      const updateTx: TxUpdateDoc<Person> = {
        _id: 'tx3' as Ref<TxUpdateDoc<Person>>,
        _class: core.class.TxUpdateDoc,
        space: contact.space.Contacts,
        modifiedOn: 0,
        modifiedBy: personId,
        objectId: personRef,
        objectClass: contact.class.Person,
        operations: {},
        objectSpace: contact.space.Contacts
      }

      cache.fillCachesForPersonRef(personRef, person)
      cache.handleTx([updateTx])

      expect(changeListener).toHaveBeenCalledWith({
        personRef,
        personIds: []
      })
    })
  })

  describe('change listeners', () => {
    it('should add and remove listeners', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      cache.addChangeListener(listener1)
      cache.addChangeListener(listener2)

      const change: Change = {
        personRef,
        personIds: []
      }

      // Trigger a change by calling handleTx
      const createTx: TxCreateDoc<Person> = {
        _id: 'tx1' as Ref<TxCreateDoc<Person>>,
        _class: core.class.TxCreateDoc,
        space: contact.space.Contacts,
        modifiedOn: 0,
        createdBy: personId,
        modifiedBy: personId,
        objectId: personRef,
        objectClass: contact.class.Person,
        objectSpace: contact.space.Contacts,
        attributes: {
          name: 'Tester',
          avatarType: AvatarType.COLOR
        }
      }

      cache.fillCachesForPersonRef(personRef, null)
      cache.handleTx([createTx])

      expect(listener1).toHaveBeenCalledWith(expect.objectContaining(change))
      expect(listener2).toHaveBeenCalledWith(expect.objectContaining(change))

      cache.removeChangeListener(listener1)

      // Trigger another change
      const updateTx: TxUpdateDoc<Person> = {
        _id: 'tx3' as Ref<TxUpdateDoc<Person>>,
        _class: core.class.TxUpdateDoc,
        space: contact.space.Contacts,
        modifiedOn: 0,
        modifiedBy: personId,
        objectId: personRef,
        objectClass: contact.class.Person,
        operations: {},
        objectSpace: contact.space.Contacts
      }
      cache.handleTx([updateTx])

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(2)
    })
  })
})
