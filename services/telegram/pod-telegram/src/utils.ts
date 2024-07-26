import client, { ClientSocket } from '@hcengineering/client'
import { Client, Doc, Ref, Space } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import FormData from 'form-data'
import mime from 'mime'
import fetch from 'node-fetch'
import { Api } from 'telegram'
import WebSocket from 'ws'
import config from './config'
import { AttachedFile } from './types'

export class DeferredPromise<T = any> {
  public readonly promise: Promise<T>
  private _resolve: (x: T) => void = () => {}
  private _reject: (err: any) => void = () => {}

  constructor () {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  get resolve (): typeof this._resolve {
    return this._resolve
  }

  get reject (): typeof this._reject {
    return this._reject
  }
}

export function normalizeValue (value: string): string {
  const trimmed = value.trim()
  const numberRegex = /^[+\d()\s-]+$/
  if (numberRegex.test(trimmed)) {
    const number = trimmed.replace(/[()\s-]+/g, '')
    return number.startsWith('+') ? number : '+' + number
  } else {
    const domain = 't.me'
    const tmeIndex = trimmed.indexOf(domain)
    if (tmeIndex === -1) {
      return trimmed.startsWith('@') ? trimmed : '@' + trimmed
    } else {
      return '@' + trimmed.slice(tmeIndex + domain.length + 1)
    }
  }
}

export async function getFiles (msg: Api.Message): Promise<AttachedFile[]> {
  if (msg.media == null) return []
  const props = getFileProps(msg.media)
  if (props === undefined) return []
  const file = await msg.downloadMedia({})
  if (file == null) return []
  const obj: AttachedFile = { ...props, file: typeof file === 'string' ? Buffer.from(file) : file }
  return [obj]
}

export async function uploadFile (
  file: AttachedFile,
  token: string,
  opts?: { space: Ref<Space>, attachedTo: Ref<Doc> }
): Promise<string> {
  const uploadUrl = config.UploadUrl
  if (uploadUrl === undefined) {
    throw Error('UploadURL is not defined')
  }

  const data = new FormData()
  data.append(
    'file',
    Object.assign(file.file, {
      lastModified: file.lastModified,
      size: file.size,
      name: file.name,
      type: file.type
    })
  )

  const params =
    opts !== undefined
      ? [
          ['space', opts.space],
          ['attachedTo', opts.attachedTo]
        ]
          .filter((x): x is [string, Ref<any>] => x[1] !== undefined)
          .map(([name, value]) => `${name}=${value}`)
          .join('&')
      : ''
  const suffix = params === '' ? params : `?${params}`

  const url = `${uploadUrl}${suffix}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token
    },
    body: data
  })

  if (resp.status !== 200) {
    throw Error(`Failed to upload file: ${resp.statusText}`)
  }

  return await resp.text()
}

export async function createPlatformClient (token: string): Promise<Client> {
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': config.ServiceID
      }
    }) as never as ClientSocket
  })

  const endpoint = await getTransactorEndpoint(token)
  const connection = await createClient(token, endpoint)

  return connection
}

export function getFileName (doc: Api.Document): string | undefined {
  const fileNameAttr = doc.originalArgs.attributes.find((p) => p.className === 'DocumentAttributeFilename')
  if (fileNameAttr !== undefined && fileNameAttr.className === 'DocumentAttributeFilename') {
    return fileNameAttr.fileName
  }
  const titleAttr = doc.originalArgs.attributes.find((p) => p.className === 'DocumentAttributeAudio')
  if (titleAttr !== undefined && titleAttr.className === 'DocumentAttributeAudio') {
    return titleAttr.title
  }
}

export function getFileProps (media: Api.TypeMessageMedia): Omit<AttachedFile, 'file'> | undefined {
  if (media.className === 'MessageMediaDocument' && media.document?.className === 'Document') {
    const lastModified = media.document.date * 1000
    const ext = mime.getExtension(media.document.mimeType)
    const name =
      ext !== null
        ? `doc_${new Date(lastModified).toLocaleString()}.${ext}`
        : `doc_${new Date(lastModified).toLocaleString()}`
    return {
      type: media.document.mimeType,
      size: media.document.size as unknown as number,
      lastModified,
      name: getFileName(media.document) ?? name
    }
  }
  if (media.className === 'MessageMediaPhoto' && media.photo?.className === 'Photo') {
    const lastModified = media.photo.date * 1000
    const ext = mime.getExtension('image/jpeg')
    const name =
      ext !== null
        ? `photo_${new Date(lastModified).toLocaleString()}.${ext}`
        : `photo_${new Date(lastModified).toLocaleString()}`
    return {
      lastModified,
      type: 'image/jpeg',
      name
    }
  }
}
