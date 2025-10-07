import { type Blob, type Ref, concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { withRetry } from '@hcengineering/retry'

import { getFileUrl, getFileStorage, getCurrentWorkspaceUuid } from './file'
import { type FileStorage } from './types'

import presentation from './plugin'

export interface PreviewMetadata {
  thumbnail?: {
    width: number
    height: number
    blurhash: string
  }
}

export interface PreviewConfig {
  image: string
  video: string
}
export interface VideoMeta {
  hls?: HLSMeta
}

export interface HLSMeta {
  thumbnail?: string
  source?: string
}

export async function getBlobRef (
  file: Ref<Blob>,
  name?: string,
  width?: number,
  height?: number
): Promise<{
    src: string
    srcset: string
  }> {
  return {
    src: getFileUrl(file, name),
    srcset: getSrcSet(file, width, height)
  }
}

export async function getBlobSrcSet (file: Ref<Blob>, width?: number, height?: number): Promise<string> {
  return getSrcSet(file, width, height)
}

export function getSrcSet (_blob: Ref<Blob>, width?: number, height?: number): string {
  const fileStorage = getFileStorage()
  return blobToSrcSet(fileStorage, _blob, width, height)
}

function blobToSrcSet (
  fileStorage: FileStorage,
  blob: Ref<Blob>,
  width: number | undefined,
  height: number | undefined
): string {
  if (blob.includes('://')) {
    return ''
  }
  return getFileUrl(blob)

  // let url = cfg.image.replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceUuid()))
  // const downloadUrl = getFileUrl(blob)

  // const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  // if (!url.includes('://')) {
  //   url = concatLink(frontUrl ?? '', url)
  // }
  // url = url.replaceAll(':downloadFile', encodeURIComponent(downloadUrl))
  // url = url.replaceAll(':blobId', encodeURIComponent(blob))

  // let result = ''
  // if (width !== undefined) {
  //   result +=
  //     fileStorage.getImageUrl(blob, { width, height: height ?? width, dpr: 1 }) +
  //     ' 1x , ' +
  //     fileStorage.getImageUrl(blob, { width, height: height ?? width, dpr: 2 }) +
  //     ' 2x, ' +
  //     fileStorage.getImageUrl(blob, { width, height: height ?? width, dpr: 3 }) +
  //     ' 3x'
  // }

  // return result
}

export function getPreviewThumbnail (file: string, width: number, height: number, dpr?: number): string {
  return getImagePreviewUrl(
    encodeURIComponent(getCurrentWorkspaceUuid()),
    encodeURIComponent(file),
    width,
    height,
    dpr ?? window.devicePixelRatio
  )
}

export async function getPreviewMetadata (workspace: string, name: string): Promise<PreviewMetadata> {
  const previewUrl = getMetadata(presentation.metadata.PreviewUrl) ?? ''

  if (previewUrl !== '') {
    const token = getMetadata(presentation.metadata.Token) ?? ''
    const url = concatLink(previewUrl, `/metadata/${workspace}/${name}`)

    try {
      const response = await withRetry(async () => {
        return await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      })
      if (response.ok) {
        const json = await response.json()
        return json as PreviewMetadata
      }
    } catch (err) {
      console.warn('Failed to fetch preview metadata', err)
    }
  }
  return {}
}

function getImagePreviewUrl (workspace: string, name: string, width: number, height: number, dpr: number): string {
  const previewUrl = getMetadata(presentation.metadata.PreviewUrl) ?? ''
  const url = `/image/fit=cover,width=${width},height=${height},dpr=${dpr}/${workspace}/${name}`
  return concatLink(previewUrl, url)
}

function formatImageSize (url: string, width: number, height: number, dpr: number): string {
  return url
    .replaceAll(':size', `${width * dpr}`)
    .replaceAll(':width', `${width}`)
    .replaceAll(':height', `${height}`)
    .replaceAll(':dpr', `${dpr}`)
}

/***
 * @deprecated, please use Blob direct operations.
 */
export function getFileSrcSet (_blob: Ref<Blob>, width?: number, height?: number): string {
  return blobToSrcSet(getFileStorage(), _blob, width, height)
}

/**
 * @public
 */
export async function getVideoMeta (file: string, filename?: string): Promise<VideoMeta | undefined> {
  // const cfg = getPreviewConfig()

  // let url = cfg.video
  //   .replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceUuid()))
  //   .replaceAll(':blobId', encodeURIComponent(file))

  // if (url === '') {
  //   return undefined
  // }

  // const token = getMetadata(presentation.metadata.Token) ?? ''
  // const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  // if (!url.includes('://')) {
  //   url = concatLink(frontUrl ?? '', url)
  // }

  // try {
  //   const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  //   if (response.ok) {
  //     const result = (await response.json()) as VideoMeta
  //     if (result.hls !== undefined) {
  //       result.hls.source = getBlobUrl(result.hls.source ?? '')
  //       result.hls.thumbnail = getBlobUrl(result.hls.thumbnail ?? '')
  //     }
  //     return result
  //   }
  // } catch {}
  return undefined
}
