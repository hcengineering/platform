// Copyright © 2026 Hardcore Engineering Inc.
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
        convertImage: images.imgElement(async () => ({ src: '' }))
      }
    )

    const text = convertString(htmlData.value)
    return text
  }
}
function isType (type: string): boolean {
  return type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}
