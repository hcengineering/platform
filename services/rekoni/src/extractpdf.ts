//
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { getDocument, OPS, type PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf'
import { type TextItem, type TypedArray } from 'pdfjs-dist/types/src/display/api'
import sharp from 'sharp'
import { type RekoniModel } from './types'
import { isPrivateCharCode } from './utils'

// Some PDFs need external cmaps.
const CMAP_URL = './node_modules/pdfjs-dist/cmaps/'
const CMAP_PACKED = true

// Where the standard fonts are located.
const STANDARD_FONT_DATA_URL = './node_modules/pdfjs-dist/standard_fonts/'

/**
 * @public
 */
export async function extractData (data: string | TypedArray): Promise<RekoniModel> {
  const doc = await getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    standardFontDataUrl: STANDARD_FONT_DATA_URL
  }).promise
  const meta = await doc.getMetadata()

  const text: RekoniModel = {
    lines: [],
    annotations: [],
    images: [],
    author: (meta.info as any).Author
  }

  const imageOps = [
    OPS.paintJpegXObject,
    OPS.paintImageMaskXObject,
    OPS.paintImageMaskXObjectGroup,
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintInlineImageXObjectGroup,
    OPS.paintImageXObjectRepeat,
    OPS.paintImageMaskXObjectRepeat,
    OPS.paintSolidColorImageMask
  ]

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)

    await processAnnotations(page, text)
    await processImages(page, imageOps, text)
    await processPage(text, page)
  }

  return text
}

async function processPage (text: RekoniModel, page: PDFPageProxy): Promise<void> {
  const textContent = await page.getTextContent({
    normalizeWhitespace: true,
    disableCombineTextItems: false,
    includeMarkedContent: false
  })

  let lastY: number = 0
  let ctext: string[] = []
  let widths: number[] = []
  let maxH = 0
  for (const item of textContent.items as TextItem[]) {
    const str = item.str
    if (str.length === 1) {
      const code = str.charCodeAt(0)
      if (isPrivateCharCode(code)) {
        // Private use characrter, skip it
        continue
      }
    }
    if (lastY === item.transform[5] || lastY === 0) {
      if (str.length > 0) {
        ctext.push(item.str)
        widths.push(item.width)
      }
      if (item.height > maxH) {
        maxH = item.height
      }
    } else {
      text.lines.push({ items: ctext, height: maxH, widths })
      maxH = item.height
      if (str.length > 0) {
        ctext = [str]
        widths = [item.width]
      } else {
        ctext = []
        widths = []
      }
    }

    lastY = item.transform[5]
  }
  text.lines.push({ items: ctext, height: maxH, widths })
}

async function processAnnotations (page: PDFPageProxy, text: RekoniModel): Promise<void> {
  const annotations = await page.getAnnotations({ intent: 'any' })
  for (const ann of annotations) {
    if ((ann.subtype ?? '').toLowerCase() === 'link' && ann.url !== undefined) {
      text.annotations.push({ type: ann.subtype.toLowerCase(), value: ann.url })
    }
  }
}

async function processImages (page: PDFPageProxy, imageOps: number[], text: RekoniModel): Promise<void> {
  const operators = await page.getOperatorList()
  for (let i = 0; i < operators.fnArray.length; i++) {
    const tt = operators.fnArray[i]
    if (imageOps.includes(tt)) {
      const obj = operators.argsArray[i][0] as string
      let objData: any
      if (obj.startsWith('g_')) {
        objData = page.commonObjs.get(obj)
      } else {
        objData = page.objs.get(obj)
      }
      if (objData !== undefined) {
        const width = objData.width
        const height = objData.height

        const rawBuffer = processImageData(objData)

        const img = sharp(rawBuffer, {
          raw: {
            width,
            height,
            channels: 4
          }
        })

        const pngBuffer = await img.toFormat('png').toBuffer()
        const buffer = await img.toFormat('jpeg').toBuffer()

        text.images.push({
          name: obj + '.jpeg',
          width,
          height,
          buffer,
          pngBuffer,
          format: 'image/jpeg',
          potentialAvatar: true
        })
      }
    }
  }
}

function processImageData (objData: any): Buffer {
  const result = Buffer.alloc(objData.width * objData.height * 4)
  if (objData.kind === 2) {
    // ImageKind.RGB_24BPP) {
    let pos = 0
    for (let i = 0; i < objData.data.length; i += 3) {
      result[pos] = objData.data[i]
      result[pos + 1] = objData.data[i + 1]
      result[pos + 2] = objData.data[i + 2]
      result[pos + 3] = 0xff

      pos += 4
    }
  } else if (objData.kind === 3) {
    // Util.ImageKind.RGBA_32BPP) {
    let pos = 0
    for (let i = 0; i < objData.data.length; i += 4) {
      result[pos] = objData.data[i]
      result[pos + 1] = objData.data[i + 1]
      result[pos + 2] = objData.data[i + 2]
      result[pos + 3] = objData.data[i + 3]

      pos += 4
    }
  }
  return result
}
