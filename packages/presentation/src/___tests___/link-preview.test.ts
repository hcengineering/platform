//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License")
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

import { canDisplayLinkPreview, fetchLinkPreviewDetails, type LinkPreviewDetails } from '../link-preview'
import { setMetadata } from '@hcengineering/platform'
import plugin from '../plugin'

const fechFunc =
  (responseFunc: (input: RequestInfo | URL, init?: RequestInit) => Response) =>
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return responseFunc(input, init)
    }

describe('canDisplayLinkPreview', () => {
  it('should return false if hostname & title are undefined', () => {
    const linkDetails: LinkPreviewDetails = {
      image: 'test-image.jpg',
      description: 'Test Description'
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(false)
  })

  it('should return false if both image and description are missing', () => {
    const linkDetails: LinkPreviewDetails = {
      hostname: 'www.example.com',
      title: 'Test Title'
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(false)
  })

  it('should return false if both title and description are empty', () => {
    const linkDetails: LinkPreviewDetails = {
      hostname: 'www.example.com',
      image: 'test-image.jpg',
      title: '',
      description: ''
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(false)
  })

  it('should return true if hostname, image, and title are present', () => {
    const linkDetails: LinkPreviewDetails = {
      hostname: 'www.example.com',
      image: 'test-image.jpg',
      title: 'Test Title'
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(true)
  })

  it('should return true if hostname, description, and title are present', () => {
    const linkDetails: LinkPreviewDetails = {
      hostname: 'www.example.com',
      title: 'Test Title',
      description: 'Test Description'
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(true)
  })

  it('should return false if hostname, image, and description are present', () => {
    const linkDetails: LinkPreviewDetails = {
      hostname: 'www.example.com',
      image: 'test-image.jpg',
      description: 'Test Description'
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(false)
  })

  it('should handle whitespace in title and description', () => {
    const linkDetails: LinkPreviewDetails = {
      hostname: 'www.example.com',
      image: 'test-image.jpg',
      title: '  ',
      description: '   '
    }
    expect(canDisplayLinkPreview(linkDetails)).toBe(false)
  })

  it('should fetch link preview details successfully', async () => {
    const fetcher = fechFunc((url) =>
      Response.json({
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://www.example.com',
        icon: 'https://www.example.com/favicon.ico',
        image: 'https://www.example.com/image.jpg'
      })
    )
    const linkDetails = await fetchLinkPreviewDetails('https://www.example.com', 5000, fetcher)
    expect(linkDetails).toEqual({
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://www.example.com',
      icon: 'https://www.example.com/favicon.ico',
      image: 'https://www.example.com/image.jpg'
    })
  })

  it('should handle errors during fetching', async () => {
    const fetcher = fechFunc(() => {
      throw new Error('something went wrong')
    })
    expect(await fetchLinkPreviewDetails('https://www.example.com', 5000, fetcher)).toEqual({})
  })

  it('should handle timeout', async () => {
    let fetcherCalled = false
    const fetcher = fechFunc((req, params) => {
      if (params?.signal === undefined) {
        fail('missed signal')
      }
      fetcherCalled = true
      return Response.json({})
    })
    await fetchLinkPreviewDetails('https://www.example.com', 50, fetcher)
    expect(fetcherCalled).toBe(true)
  })

  it('should add auth token', async () => {
    let tokenProvided = false
    setMetadata(plugin.metadata.Token, 'token')
    const fetcher = fechFunc((req, params) => {
      if (!(params?.headers instanceof Headers)) {
        fail('missed headers')
      }
      if (params.headers.get('Authorization') !== 'Bearer token') {
        fail('missed token')
      }
      tokenProvided = true
      return Response.json({})
    })
    await fetchLinkPreviewDetails('https://www.example.com', 50, fetcher)
    expect(tokenProvided).toBe(true)
  })
})
