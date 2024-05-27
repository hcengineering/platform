import type { BlobLookup, WorkspaceIdWithUrl } from '@hcengineering/core'

/**
 *
 * Override preview URL.
  :workspace - will be replaced with current workspace
  :downloadFile - will be replaced with direct download link
  :blobId - will be replaced with blobId

  previewUrl?: string
  Comma separated list of preview formats
  If previewUrl === '', preview is disabled

  formats?: string
  Defaults: ['avif', 'webp', 'heif', 'jpeg']
 */
export function addBlobPreviewLookup (
  workspaceId: WorkspaceIdWithUrl,
  bl: BlobLookup,
  formats: string | undefined,
  previewUrl: string | undefined
): void {
  if (previewUrl === '') {
    // Preview is disabled
    return
  }
  const _formats = formats?.split(',') ?? ['avif', 'webp', 'heif', 'jpeg']
  if (bl.contentType.includes('image/')) {
    if (previewUrl !== undefined) {
      let url = previewUrl
      url = url.replaceAll(':workspace', encodeURIComponent(workspaceId.workspaceUrl))
      url = url.replaceAll(':downloadFile', encodeURIComponent(bl.downloadUrl))
      url = url.replaceAll(':blobId', encodeURIComponent(bl._id))
      bl.previewUrl = url
      bl.previewFormats = _formats
    } else {
      // Use default preview url
      bl.previewUrl = `/files/${workspaceId.workspaceUrl}?file=${bl._id}.:format&size=:size`
      bl.previewFormats = _formats
    }
  }
}
