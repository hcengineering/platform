//
// Copyright © 2025 Andrey Sobolev(haiodo@gmail.com)
//

import jwt from 'jwt-simple'
import { validate as uuidValidate } from 'uuid'
import config from './config.js'

const encode = jwt.encode
const validate = uuidValidate

export type PersonUuid = string & { __personUuid: true }
export type AccountUuid = PersonUuid
export type WorkspaceUuid = string & { __workspaceUuid: true }

export const systemAccountUuid = '1749089e-22e6-48de-af4e-165e18fbd2f9' as AccountUuid

export class TokenError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'TokenError'
  }
}

export function generateToken (
  accountUuid: PersonUuid,
  workspaceUuid?: WorkspaceUuid,
  extra?: Record<string, string>,
  service?: string
): string {
  if (!validate(accountUuid)) {
    throw new TokenError(`Invalid account uuid: "${accountUuid}"`)
  }
  if (workspaceUuid !== undefined && !validate(workspaceUuid)) {
    throw new TokenError(`Invalid workspace uuid: "${workspaceUuid}"`)
  }

  if (service !== undefined) {
    extra = { service, ...extra }
  }

  return encode(
    {
      ...(extra !== undefined ? { extra } : {}),
      account: accountUuid,
      workspace: workspaceUuid
    },
    config.ServerSecret
  )
}
