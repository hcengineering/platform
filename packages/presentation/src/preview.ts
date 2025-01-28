import type { Blob, Ref } from '@hcengineering/core'
import { concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'

import { getFileUrl, getCurrentWorkspaceId } from './file'
import presentation from './plugin'

export interface PreviewConfig {
  image: string
  video: string
}

export interface VideoMeta {
  status: 'ready' | 'error' | 'inprogress' | 'queued' | 'downloading' | 'pendingupload'
  thumbnail: string
  hls: string
}

const defaultImagePreview = (): string => `/files/${getCurrentWorkspaceId()}?file=:blobId&size=:size`

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
  width?: number
): Promise<{
    src: string
    srcset: string
  }> {
  return {
    src: getFileUrl(file, name),
    srcset: getSrcSet(file, width)
  }
}

export async function getBlobSrcSet (file: Ref<Blob>, width?: number): Promise<string> {
  return getSrcSet(file, width)
}

export function getSrcSet (_blob: Ref<Blob>, width?: number): string {
  return blobToSrcSet(getPreviewConfig(), _blob, width)
}

function blobToSrcSet (cfg: PreviewConfig, blob: Ref<Blob>, width: number | undefined): string {
  if (blob.includes('://')) {
    return ''
  }

  let url = cfg.image.replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceId()))
  const downloadUrl = getFileUrl(blob)

  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  if (!url.includes('://')) {
    url = concatLink(frontUrl ?? '', url)
  }
  url = url.replaceAll(':downloadFile', encodeURIComponent(downloadUrl))
  url = url.replaceAll(':blobId', encodeURIComponent(blob))

  let result = ''
  const fu = url
  if (width !== undefined) {
    result +=
      fu.replaceAll(':size', `${width}`) +
      ' 1x , ' +
      fu.replaceAll(':size', `${width * 2}`) +
      ' 2x, ' +
      fu.replaceAll(':size', `${width * 3}`) +
      ' 3x'
  }

  return result
}

/***
 * @deprecated, please use Blob direct operations.
 */
export function getFileSrcSet (_blob: Ref<Blob>, width?: number): string {
  return blobToSrcSet(getPreviewConfig(), _blob, width)
}

/**
 * @public
 */
export async function getVideoMeta (file: string, filename?: string): Promise<VideoMeta | undefined> {
  const cfg = getPreviewConfig()

  let url = cfg.video
    .replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceId()))
    .replaceAll(':blobId', encodeURIComponent(file))

  if (url === '') {
    return undefined
  }

  const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
  if (!url.includes('://')) {
    url = concatLink(frontUrl ?? '', url)
  }

  try {
    const response = await fetch(url)
    if (response.ok) {
      return (await response.json()) as VideoMeta
    }
  } catch {}
}
