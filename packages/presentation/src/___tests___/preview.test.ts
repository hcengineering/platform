//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

jest.mock('../file', () => ({
  getCurrentWorkspaceUuid: () => 'ws-uuid',
  getFileUrl: (file: string) => (file.includes('://') ? file : `/files/ws-uuid?file=${encodeURIComponent(file)}`),
  getFileStorage: () => ({})
}))

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return { ...actual, getMetadata: () => 'https://preview.example.com' }
})

import { getPreviewThumbnail, getSrcSet } from '../preview'

describe('getPreviewThumbnail', () => {
  it('routes a blob id through the preview service', () => {
    expect(getPreviewThumbnail('blob-id', 100, 200, 2)).toEqual(
      'https://preview.example.com/image/fit=cover,width=100,height=200,dpr=2/ws-uuid/blob-id'
    )
  })

  it('percent-encodes a blob id that needs it', () => {
    expect(getPreviewThumbnail('a b/c', 100, 200, 2)).toEqual(
      'https://preview.example.com/image/fit=cover,width=100,height=200,dpr=2/ws-uuid/a%20b%2Fc'
    )
  })

  it('passes an absolute http URL through unchanged', () => {
    const url = 'https://cdn.example.com/thumbnails/cover.png'
    expect(getPreviewThumbnail(url, 100, 200, 2)).toEqual(url)
  })

  it('passes an absolute URL with a query string through unchanged', () => {
    const url = 'https://cdn.example.com/thumbnails/cover.png?token=abc'
    expect(getPreviewThumbnail(url, 300, 300, 1)).toEqual(url)
  })

  it('agrees with getSrcSet on what counts as an absolute URL', () => {
    // blobToSrcSet already bails out of the preview-service path for '://' refs;
    // getPreviewThumbnail must recognise exactly the same refs.
    const url = 'https://cdn.example.com/thumbnails/cover.png'
    expect(getSrcSet(url as any, 100, 200)).toEqual('')
    expect(getPreviewThumbnail(url, 100, 200, 2)).toEqual(url)
  })
})
