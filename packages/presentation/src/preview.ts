import type { Blob, Ref } from '@hcengineering/core'
import { concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { withRetry } from '@hcengineering/retry'

import { getFileUrl, getCurrentWorkspaceUuid } from './file'
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

const defaultImagePreview = (): string => `/files/${getCurrentWorkspaceUuid()}?file=:blobId&size=:size`

/**
 *
 * PREVIEW_CONFIG env variable format.
 * - image - an Url with :workspace, :blobId, :downloadFile, :size placeholders.
 * - video - an Url with :workspace, :blobId placeholders.
 */
export function parsePreviewConfig (config?: string): PreviewConfig | undefined {
  if (config === undefined) {
    return
  }

  const previewConfig = { image: defaultImagePreview(), video: '' }

  const configs = config.split(';')
  for (const c of configs) {
    if (c.includes('|')) {
      const [key, value] = c.split('|')
      if (key === 'image') {
        previewConfig.image = value
      } else if (key === 'video') {
        previewConfig.video = value
      } else {
        throw new Error(`Unknown preview config key: ${key}`)
      }
    } else {
      // fallback to image-only config for compatibility
      previewConfig.image = c
    }
  }

  return Object.freeze(previewConfig)
}

export function getPreviewConfig (): PreviewConfig {
  return (
    (getMetadata(presentation.metadata.PreviewConfig) as PreviewConfig) ?? {
      image: defaultImagePreview(),
      video: ''
    }
  )
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
  return blobToSrcSet(getPreviewConfig(), _blob, width, height)
}

function blobToSrcSet (
  cfg: PreviewConfig,
  blob: Ref<Blob>,
  width: number | undefined,
  height: number | undefined
): string {
  if (blob.includes('://')) {
    return ''
  }

  const workspace = encodeURIComponent(getCurrentWorkspaceUuid())
  const name = encodeURIComponent(blob)

  const previewUrl = getMetadata(presentation.metadata.PreviewUrl) ?? ''
  if (previewUrl !== '') {
    if (width !== undefined) {
      return (
        getImagePreviewUrl(workspace, name, width, height ?? width, 1) +
        ' 1x , ' +
        getImagePreviewUrl(workspace, name, width, height ?? width, 2) +
        ' 2x, ' +
        getImagePreviewUrl(workspace, name, width, height ?? width, 3) +
        ' 3x'
      )
    } else {
      return ''
    }
  }

  let url = cfg.image.replaceAll(':workspace', workspace)
  const downloadUrl = getFileUrl(blob)

  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  if (!url.includes('://')) {
    url = concatLink(frontUrl ?? '', url)
  }
  url = url.replaceAll(':downloadFile', encodeURIComponent(downloadUrl))
  url = url.replaceAll(':blobId', name)

  let result = ''
  if (width !== undefined) {
    result +=
      formatImageSize(url, width, height ?? width, 1) +
      ' 1x , ' +
      formatImageSize(url, width, height ?? width, 2) +
      ' 2x, ' +
      formatImageSize(url, width, height ?? width, 3) +
      ' 3x'
  }

  return result
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
  return blobToSrcSet(getPreviewConfig(), _blob, width, height)
}

/**
 * @public
 */
export async function getVideoMeta (file: string, filename?: string): Promise<VideoMeta | undefined> {
  const cfg = getPreviewConfig()

  let url = cfg.video
    .replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceUuid()))
    .replaceAll(':blobId', encodeURIComponent(file))

  if (url === '') {
    return undefined
  }

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  if (!url.includes('://')) {
    url = concatLink(frontUrl ?? '', url)
  }

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      return (await response.json()) as VideoMeta
    }
  } catch {}
}
