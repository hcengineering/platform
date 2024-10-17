//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { getBlobURL } from './blob'

const prefferedImageFormats = ['webp', 'avif', 'jpeg', 'png']

export async function getImage (
  request: Request,
  workspace: string,
  name: string,
  transform: string
): Promise<Response> {
  const Accept = request.headers.get('Accept') ?? 'image/*'
  const image: Record<string, string> = {}

  // select format based on Accept header
  const formats = Accept.split(',')
  for (const format of formats) {
    const [type] = format.split(';')
    const [clazz, kind] = type.split('/')
    if (clazz === 'image' && prefferedImageFormats.includes(kind)) {
      image.format = kind
      break
    }
  }

  // apply transforms
  transform.split(',').reduce((acc, param) => {
    const [key, value] = param.split('=')
    acc[key] = value
    return acc
  }, image)

  const blobURL = getBlobURL(request, workspace, name)
  const imageRequest = new Request(blobURL, { headers: { Accept } })
  return await fetch(imageRequest, { cf: { image, cacheTtl: 3600 } })
}
