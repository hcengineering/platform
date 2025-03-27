// import { generateId, PersonId, PersonUuid, TxOperations } from '@hcengineering/core'
// import contact, { AvatarType, combineName } from '@hcengineering/contact'

// export async function ensureLocalPerson (
//     personUuid: PersonUuid,
//     socialId: PersonId,
//     firstName: string,
//     lastName: string,
//     client: TxOperations
// ) {
//     let person = await client.findOne(
//       contact.class.Person,
//       {
//         personUuid
//       },
//       {
//         projection: { name: 1 }
//       }
//     )
//     console.log('PERSON', person)
//     if (person === undefined) {
//       const newPersonId = await client.createDoc(
//         contact.class.Person,
//         contact.space.Contacts,
//         {
//           avatarType: AvatarType.COLOR,
//           name: combineName(firstName, lastName),
//           personUuid
//         },
//         generateId(),
//       )
//       person = await client.findOne(contact.class.Person, { _id: newPersonId })
//       console.log('PERSON_NEW', person)
//       if (person === undefined) {
//         throw new Error(`Failed to create local person for ${personUuid}`)
//       }
//       await client.addCollection(
//         contact.class.SocialIdentity,
//         contact.space.Contacts,
//         person._id,
//         contact.class.Person,
//         'socialIds',
//         {
//           key: guestSocialId,
//           type: SocialIdType.EMAIL,
//           value: req.booking.email,
//         },
//         generateId()
//       )
//     }
//   }
// }
