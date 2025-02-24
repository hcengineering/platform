//
// Copyright © 2020 Anticrm Platform Contributors.
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

/* eslint-env jest */
import { setMetadata } from '@hcengineering/platform'
import serverCore from '@hcengineering/server-core'
import { jsonToHTML, htmlToJSON } from '@hcengineering/text'
import { markupToMarkdown, markdownToMarkup, parseMessageMarkdown, serializeMessage } from '..'
import { appendGuestLinkToModel, stripGuestLink } from '../../sync/guest'
import { GithubKit } from '../extensions'

const refUrl: string = 'ref://'
const imageUrl: string = 'http://localhost'
const guestUrl: string = 'http://localhost:8080/guest'

const extensions = [GithubKit]

describe('server', () => {
  it('embedded markup parsing', () => {
    const markdown = `test5

    <img width="721" alt="Screenshot 2024-01-22 at 10 39 21" src="https://github.com/haiodo-dev/my-issues/assets/477235/2452713a-ede2-4e0d-a448-9b1687c95cd9">
        
    <img alt="Screenshot 2024-01-22 at 10 39 26" src="https://github.com/haiodo-dev/my-issues/assets/477235/6a8799fd-242d-4e70-9eba-0a769eede71b">
        
    `
    const json = parseMessageMarkdown(markdown, refUrl, imageUrl, guestUrl)

    const html = jsonToHTML(json, extensions)

    const json2 = htmlToJSON(html, extensions)
    const newMarkdown = serializeMessage(json2, refUrl, imageUrl)

    console.log(newMarkdown)
  })
  it('add html link', () => {
    const markdown = `test5

<img width="721" alt="Screenshot 2024-01-22 at 10 39 21" src="https://github.com/haiodo-dev/my-issues/assets/477235/2452713a-ede2-4e0d-a448-9b1687c95cd9">
    
<img alt="Screenshot 2024-01-22 at 10 39 26" src="https://github.com/haiodo-dev/my-issues/assets/477235/6a8799fd-242d-4e70-9eba-0a769eede71b">

<sub>
  View at Huly <a href="https://github.com/haiodo-dev/my-issues/issues/1">TSK-1023</a>
</sub>
`

    const json = parseMessageMarkdown(markdown, refUrl, imageUrl, guestUrl)
    console.log(json)
    const html = jsonToHTML(json, extensions)
    const json2 = htmlToJSON(html, extensions)
    const newMarkdown = serializeMessage(json2, refUrl, imageUrl)
    console.log(newMarkdown)
  })
  it('check parsing with sub', async () => {
    const markdown =
      'qwe4 qwe6\n\n![](http://localhost:8080/files?workspace=github&file=76e25453-186d-46e5-b9cd-d296a5342ce2&width=997)qwe 77\n\nzzz2 3\n\n<sub>View in Huly <a href="http://localhost:8080/guest/github?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsaW5rSWQiOiI2NWRlYWU4NGExZTRkY2Q2OWFlMzlmOTMiLCJndWVzdCI6InRydWUiLCJlbWFpbCI6IiNndWVzdEBoYy5lbmdpbmVlcmluZyIsIndvcmtzcGFjZSI6ImdpdGh1YiIsInByb2R1Y3RJZCI6IiJ9.6RJjjnn9JgDxQmsZ3AmMj8aqHI7Px4BwPxqyMK83OyM">TSK-50</a></sub>'
    const json = parseMessageMarkdown(markdown, refUrl, imageUrl, guestUrl)
    setMetadata(serverCore.metadata.FrontUrl, 'http://localhost:8080')
    await stripGuestLink(json)
    const newMarkdown = serializeMessage(json, refUrl, imageUrl)
    console.log(json, newMarkdown)
    expect(newMarkdown).toBe(
      'qwe4 qwe6\n\n![](http://localhost76e25453-186d-46e5-b9cd-d296a5342ce2&width=997)qwe 77\n\nzzz2 3'
    )
  })
  it('code block', async () => {
    const markdown = '```bash\n2\nbash qwe\n3\nbase qwe2\n4\nbaseh qwe4\n5\n```'
    const markup = markdownToMarkup(markdown)
    const markdown2 = await markupToMarkdown(markup)
    expect(markdown2).toBe(markdown)
  })

  it('block image', async () => {
    const markdown = 'qwerty\n<img width="320" src="http://example.com/image" alt="image">'
    const markup = markdownToMarkup(markdown)
    const markdown2 = await markupToMarkdown(markup)
    expect(markdown2).toBe(markdown)
  })

  it('inline image', async () => {
    const markdown = '* line 1\n* line 2\n  <img width="320" src="http://example.com/image" alt="image">'
    const markup = markdownToMarkup(markdown)
    const markdown2 = await markupToMarkdown(markup)
    expect(markdown2).toBe(markdown)
  })

  it('test view in serialization', async () => {
    const markdown = '```bash\n2\nbash qwe\n3\nbase qwe2\n4\nbaseh qwe4\n5\n```'
    const json = parseMessageMarkdown(markdown, refUrl, imageUrl, guestUrl)
    appendGuestLinkToModel(json, 'http://test.com', 'TSK-1235')
    const serializedMarkdown = serializeMessage(json, refUrl, imageUrl)
    await stripGuestLink(json)
    const serializedMarkdown2 = serializeMessage(json, refUrl, imageUrl)
    expect(serializedMarkdown).toBe(
      '```bash\n2\nbash qwe\n3\nbase qwe2\n4\nbaseh qwe4\n5\n```\n\n<sub><a href="http://test.com">Huly&reg;: <b>TSK-1235</b></a></sub>'
    )
    expect(serializedMarkdown2).toBe('```bash\n2\nbash qwe\n3\nbase qwe2\n4\nbaseh qwe4\n5\n```')
  })
})
