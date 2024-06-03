//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { getMetadata } from '@hcengineering/platform'

import sign from './plugin'

export function getSignBaseURL (): string {
  const endpoint = getMetadata(sign.metadata.SignURL)

  if (endpoint === undefined || endpoint === '') {
    throw new Error('Sign service endpoint url is not configured')
  }

  return endpoint
}

export async function signPDF (file: string, token: string): Promise<string> {
  if (token === '') {
    return ''
  }

  const url: URL = new URL(`${getSignBaseURL()}/sign`)

  const request = {
    fileId: file
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  const res = await response.json()

  if (!response.ok) {
    throw new Error(res.message)
  }

  return res.id
}
