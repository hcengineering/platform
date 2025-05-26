export type AttachmentImageSize = 'x-large' | 'auto'

export interface LinkPreviewData {
  url: string
  host: string
  title?: string
  description?: string
  hostname?: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  icon?: string
}
