import { convertToHtml, images } from 'mammoth'
import { contentType } from 'mime-types'
import { DocumentExtractor } from './types'

import { convertString } from './html'

export const docxExtractor: DocumentExtractor = {
  async isMatch (fileName: string, type: string | false, data): Promise<boolean> {
    if (type === false) return false
    if (isType(type)) {
      return true
    }
    // Try detect by fileName
    type = contentType(fileName)
    return type === false ? false : isType(type)
  },

  async extract (fileName: string, type: string, data): Promise<string> {
    const htmlData = await convertToHtml(
      { buffer: data },
      {
        convertImage: images.imgElement((image) => {
          return image.read('base64').then(function (imageBuffer) {
            return {
              src: ''
            }
          })
        })
      }
    )

    const text = convertString(htmlData.value)
    return text
  }
}
function isType (type: string): boolean {
  return type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}
