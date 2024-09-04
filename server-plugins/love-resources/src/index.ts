//
// Copyright © 2024 Hardcore Engineering Inc.
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

import contact, { Employee, Person, PersonAccount, formatName, getName } from '@hcengineering/contact'
import core, {
  Account,
  Ref,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxUpdateDoc,
  UserStatus
} from '@hcengineering/core'
import love, {
  Invite,
  JoinRequest,
  ParticipantInfo,
  RequestStatus,
  RoomAccess,
  isOffice,
  loveId
} from '@hcengineering/love'
import notification from '@hcengineering/notification'
import { translate } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import {
  createPushNotification,
  getNotificationProviderControl,
  isAllowed
} from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'

export async function OnEmployee (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxMixin<Person, Employee>
  if (actualTx._class !== core.class.TxMixin) return []
  if (actualTx.mixin !== contact.mixin.Employee) return []
  const val = actualTx.attributes.active
  if (val === undefined) return []
  if (val) {
    const freeRoom = (await control.findAll(control.ctx, love.class.Office, { person: null }))[0]
    if (freeRoom !== undefined) {
      return [
        control.txFactory.createTxUpdateDoc(freeRoom._class, freeRoom.space, freeRoom._id, {
          person: actualTx.objectId
        })
      ]
    }
  } else {
    const room = (await control.findAll(control.ctx, love.class.Office, { person: actualTx.objectId }))[0]
    if (room !== undefined) {
      return [
        control.txFactory.createTxUpdateDoc(room._class, room.space, room._id, {
          person: null
        })
      ]
    }
  }
  return []
}

async function createUserInfo (acc: Ref<Account>, control: TriggerControl): Promise<Tx[]> {
  const account = control.modelDb.findAllSync(contact.class.PersonAccount, { _id: acc as Ref<PersonAccount> })[0]
  if (account === undefined) return []
  const personId = account.person

  // we already have participantInfo for this person
  const infos = await control.findAll(control.ctx, love.class.ParticipantInfo, { person: personId })
  if (infos.length > 0) return []

  const person = (await control.findAll(control.ctx, contact.class.Person, { _id: personId }))[0]
  const room = (await control.findAll(control.ctx, love.class.Office, { person: personId }))[0]
  const tx = control.txFactory.createTxCreateDoc(love.class.ParticipantInfo, core.space.Workspace, {
    person: personId,
    name: person !== undefined ? getName(control.hierarchy, person, control.branding?.lastNameFirst) : account.email,
    room: room?._id ?? love.ids.Reception,
    x: 0,
    y: 0,
    sessionId: null
  })
  const ptx = control.txFactory.createTxApplyIf(
    core.space.Workspace,
    personId,
    [],
    [
      {
        _class: love.class.ParticipantInfo,
        query: { person: personId }
      }
    ],
    [tx],
    'createUserInfo'
  )
  return [ptx]
}

async function removeUserInfo (acc: Ref<Account>, control: TriggerControl): Promise<Tx[]> {
  const account = control.modelDb.findAllSync(contact.class.PersonAccount, { _id: acc as Ref<PersonAccount> })[0]
  if (account === undefined) return []

  // recheck that user is still offline
  const status = (await control.findAll(control.ctx, core.class.UserStatus, { user: acc }))[0]
  if (status !== undefined && status.online) return []

  const person = account.person
  const infos = await control.findAll(control.ctx, love.class.ParticipantInfo, { person })
  const res: Tx[] = []
  for (const info of infos) {
    res.push(control.txFactory.createTxRemoveDoc(info._class, info.space, info._id))
  }
  return res
}

export async function OnUserStatus (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxCUD<UserStatus>
  if (actualTx.objectClass !== core.class.UserStatus) return []
  if (actualTx._class === core.class.TxCreateDoc) {
    const createTx = actualTx as TxCreateDoc<UserStatus>
    const status = TxProcessor.createDoc2Doc(createTx)
    return await createUserInfo(status.user, control)
  } else if (actualTx._class === core.class.TxUpdateDoc) {
    const updateTx = actualTx as TxUpdateDoc<UserStatus>
    const val = updateTx.operations.online
    if (val === undefined) return []
    const status = (await control.findAll(control.ctx, core.class.UserStatus, { _id: updateTx.objectId }))[0]
    if (status !== undefined) {
      if (val) {
        return await createUserInfo(status.user, control)
      } else {
        return await new Promise((resolve) => {
          setTimeout(() => {
            void removeUserInfo(status.user, control).then((res) => {
              resolve(res)
            })
          }, 20000)
        })
      }
    }
  }
  return []
}

async function roomJoinHandler (info: ParticipantInfo, control: TriggerControl): Promise<Tx[]> {
  const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
  const roomInfo = roomInfos.find((ri) => ri.room === info.room)
  if (roomInfo !== undefined) {
    roomInfo.persons.push(info.person)
    return [
      control.txFactory.createTxUpdateDoc(love.class.RoomInfo, core.space.Workspace, roomInfo._id, {
        persons: Array.from(new Set([...roomInfo.persons, info.person]))
      })
    ]
  } else {
    const room = (await control.findAll(control.ctx, love.class.Room, { _id: info.room }))[0]
    if (room === undefined) return []
    return [
      control.txFactory.createTxCreateDoc(love.class.RoomInfo, core.space.Workspace, {
        persons: [info.person],
        room: info.room,
        isOffice: isOffice(room)
      })
    ]
  }
}

async function rejectJoinRequests (info: ParticipantInfo, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
  const oldRoomInfo = roomInfos.find((ri) => ri.persons.includes(info.person))
  if (oldRoomInfo !== undefined) {
    const restPersons = oldRoomInfo.persons.filter((p) => p !== info.person)
    if (restPersons.length === 0) {
      const requests = await control.findAll(control.ctx, love.class.JoinRequest, {
        room: oldRoomInfo.room,
        status: RequestStatus.Pending
      })
      for (const request of requests) {
        res.push(
          control.txFactory.createTxUpdateDoc(love.class.JoinRequest, core.space.Workspace, request._id, {
            status: RequestStatus.Rejected
          })
        )
      }
    }
  }
  return res
}

async function setDefaultRoomAccess (info: ParticipantInfo, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const roomInfos = await control.queryFind(control.ctx, love.class.RoomInfo, {})
  const oldRoomInfo = roomInfos.find((ri) => ri.persons.includes(info.person))
  if (oldRoomInfo !== undefined) {
    oldRoomInfo.persons = oldRoomInfo.persons.filter((p) => p !== info.person)
    if (oldRoomInfo.persons.length === 0) {
      res.push(control.txFactory.createTxRemoveDoc(oldRoomInfo._class, oldRoomInfo.space, oldRoomInfo._id))

      const resetAccessTx = control.txFactory.createTxUpdateDoc(
        oldRoomInfo.isOffice ? love.class.Office : love.class.Room,
        core.space.Workspace,
        oldRoomInfo.room,
        {
          access: oldRoomInfo.isOffice ? RoomAccess.Knock : RoomAccess.Open
        }
      )
      res.push(resetAccessTx)
    } else {
      res.push(
        control.txFactory.createTxUpdateDoc(love.class.RoomInfo, core.space.Workspace, oldRoomInfo._id, {
          persons: oldRoomInfo.persons
        })
      )
    }
  }
  return res
}

export async function OnParticipantInfo (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxCUD<ParticipantInfo>
  if (actualTx._class === core.class.TxCreateDoc) {
    const info = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<ParticipantInfo>)
    return await roomJoinHandler(info, control)
  }
  if (actualTx._class === core.class.TxRemoveDoc) {
    const removedInfo = control.removedMap.get(actualTx.objectId) as ParticipantInfo
    if (removedInfo === undefined) return []
    return await setDefaultRoomAccess(removedInfo, control)
  }
  if (actualTx._class === core.class.TxUpdateDoc) {
    const newRoom = (actualTx as TxUpdateDoc<ParticipantInfo>).operations.room
    if (newRoom === undefined) return []
    const info = (
      await control.findAll(control.ctx, love.class.ParticipantInfo, { _id: actualTx.objectId }, { limit: 1 })
    )[0]
    if (info === undefined) return []
    const res: Tx[] = []
    res.push(...(await rejectJoinRequests(info, control)))
    res.push(...(await setDefaultRoomAccess(info, control)))
    res.push(...(await roomJoinHandler(info, control)))
    return res
  }
  return []
}

export async function OnKnock (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxCreateDoc<JoinRequest>
  if (actualTx._class === core.class.TxCreateDoc) {
    const request = TxProcessor.createDoc2Doc(actualTx)
    if (request.status === RequestStatus.Pending) {
      const roomInfo = (await control.findAll(control.ctx, love.class.RoomInfo, { room: request.room }))[0]
      if (roomInfo !== undefined) {
        const res: Tx[] = []
        const from = (await control.findAll(control.ctx, contact.class.Person, { _id: request.person }))[0]
        if (from === undefined) return []
        const type = await control.modelDb.findOne(notification.class.NotificationType, {
          _id: love.ids.KnockNotification
        })
        if (type === undefined) return []
        const provider = await control.modelDb.findOne(notification.class.NotificationProvider, {
          _id: notification.providers.PushNotificationProvider
        })
        if (provider === undefined) return []

        const notificationControl = await getNotificationProviderControl(control.ctx, control)
        for (const user of roomInfo.persons) {
          const userAcc = control.modelDb.getAccountByPersonId(user) as PersonAccount[]
          if (userAcc.length === 0) continue
          if (userAcc.some((it) => isAllowed(control, it._id, type, provider, notificationControl))) {
            const path = [workbenchId, control.workspace.workspaceUrl, loveId]
            const title = await translate(love.string.KnockingLabel, {})
            const body = await translate(love.string.IsKnocking, {
              name: formatName(from.name, control.branding?.lastNameFirst)
            })
            // TODO: Select proper account target
            await createPushNotification(control, userAcc[0]._id, title, body, request._id, from, path)
          }
        }
        return res
      }
    }
  }
  return []
}

export async function OnInvite (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxCreateDoc<Invite>
  if (actualTx._class === core.class.TxCreateDoc) {
    const invite = TxProcessor.createDoc2Doc(actualTx)
    if (invite.status === RequestStatus.Pending) {
      const target = (await control.findAll(control.ctx, contact.class.Person, { _id: invite.target }))[0]
      if (target === undefined) return []
      const userAcc = control.modelDb.getAccountByPersonId(target._id) as PersonAccount[]
      if (userAcc.length === 0) return []
      const from = (await control.findAll(control.ctx, contact.class.Person, { _id: invite.from }))[0]
      const type = await control.modelDb.findOne(notification.class.NotificationType, {
        _id: love.ids.InviteNotification
      })
      if (type === undefined) return []
      const provider = await control.modelDb.findOne(notification.class.NotificationProvider, {
        _id: notification.providers.PushNotificationProvider
      })
      if (provider === undefined) return []
      const notificationControl = await getNotificationProviderControl(control.ctx, control)
      if (userAcc.some((it) => isAllowed(control, it._id, type, provider, notificationControl))) {
        const path = [workbenchId, control.workspace.workspaceUrl, loveId]
        const title = await translate(love.string.InivitingLabel, {})
        const body =
          from !== undefined
            ? await translate(love.string.InvitingYou, {
              name: formatName(from.name, control.branding?.lastNameFirst)
            })
            : await translate(love.string.InivitingLabel, {})
        // TODO: Select a proper user
        await createPushNotification(control, userAcc[0]._id, title, body, invite._id, from, path)
      }
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnEmployee,
    OnUserStatus,
    OnParticipantInfo,
    OnKnock,
    OnInvite
  }
})
