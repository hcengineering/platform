import type { Blob, Ref } from '@hcengineering/core'
import { concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'

import { getFileUrl, getCurrentWorkspaceId } from './file'
import presentation from './plugin'

export interface PreviewConfig {
  previewUrl: string
}

const defaultPreview = (): string => `/files/${getCurrentWorkspaceId()}?file=:blobId&size=:size`

/**
 *
 * PREVIEW_CONFIG env variable format.
 * previewUrl - an Url with :workspace, :blobId, :downloadFile, :size placeholders, they will be replaced in UI with an appropriate blob values.
 */
export function parsePreviewConfig (config?: string): PreviewConfig | undefined {
  if (config === undefined) {
    return
  }
  return { previewUrl: config }
}

export function getPreviewConfig (): PreviewConfig {
  return (
    (getMetadata(presentation.metadata.PreviewConfig) as PreviewConfig) ?? {
      previewUrl: defaultPreview()
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

  let url = cfg.previewUrl.replaceAll(':workspace', encodeURIComponent(getCurrentWorkspaceId()))
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
