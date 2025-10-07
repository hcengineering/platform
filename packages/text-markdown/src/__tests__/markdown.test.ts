//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { MarkupNode } from '@hcengineering/text-core'
import { markdownToMarkup, markupToMarkdown } from '..'
import { isMarkdownsEquals } from '../compare'

const refUrl: string = 'ref://'
const imageUrl: string = 'http://localhost'
const options = { refUrl, imageUrl }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualMarkdown: (expected: string) => R
    }
  }
}

expect.extend({
  toEqualMarkdown (received: string, expected: string) {
    const pass = isMarkdownsEquals(received, expected)
    return {
      message: () =>
        pass
          ? `Expected markdown strings NOT to be equal:\n Received:\n${received}\n Expected:\n${expected}`
          : `Expected markdown strings to be equal:\n Received:\n${received}\n Expected:\n${expected}`,
      pass
    }
  }
})

describe('markdownToMarkup', () => {
  const tests: Array<{ name: string, markdown: string, markup: object }> = [
    {
      name: 'simple text',
      markdown: 'Lorem ipsum dolor sit amet.',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Lorem ipsum dolor sit amet.',
                marks: []
              }
            ]
          }
        ]
      }
    },
    {
      name: 'text with heading',
      markdown: `# Lorem ipsum

Lorem ipsum dolor sit amet.
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'Lorem ipsum',
                marks: []
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Lorem ipsum dolor sit amet.',
                marks: []
              }
            ]
          }
        ]
      }
    },
    {
      name: 'bullet list',
      markdown: `# bullet list
- list item 1
- list item 2
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'bullet list',
                marks: []
              }
            ]
          },
          {
            type: 'bulletList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item 1',
                        marks: []
                      }
                    ]
                  }
                ]
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item 2',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'todos',
      markdown: `# TODO
- [ ] todo 1
- [x] todo 2
  `,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'TODO',
                marks: []
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo 1',
                        marks: []
                      }
                    ]
                  }
                ]
              },
              {
                type: 'todoItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo 2',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'todos followed by list items',
      markdown: `# todo and list
- [ ] todo 1
- [x] todo 2
- list item 1
- list item 2
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'todo and list',
                marks: []
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo 1',
                        marks: []
                      }
                    ]
                  }
                ]
              },
              {
                type: 'todoItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo 2',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'bulletList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item 1',
                        marks: []
                      }
                    ]
                  }
                ]
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item 2',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'todos followed by list items',
      markdown: `# mixed lists
- [ ] todo 1
- list item 1
- [x] todo 2
- list item 2
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'mixed lists',
                marks: []
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo 1',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'bulletList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item 1',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo 2',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'bulletList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item 2',
                        marks: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'nested todos',
      markdown: `# nested todos
- [ ] todo
  - [x] sub todo
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'nested todos',
                marks: []
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo',
                        marks: []
                      }
                    ]
                  },
                  {
                    type: 'todoList',
                    attrs: {
                      bullet: '-'
                    },
                    content: [
                      {
                        type: 'todoItem',
                        attrs: { checked: true },
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'sub todo',
                                marks: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'nested lists',
      markdown: `# nested lists
- [ ] todo
  - sub list item
  - [x] sub todo
- list item
  - [x] sub todo
  - sub list item
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'nested lists',
                marks: []
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo',
                        marks: []
                      }
                    ]
                  },
                  {
                    type: 'bulletList',
                    attrs: {
                      bullet: '-'
                    },
                    content: [
                      {
                        type: 'listItem',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'sub list item',
                                marks: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    type: 'todoList',
                    attrs: {
                      bullet: '-'
                    },
                    content: [
                      {
                        type: 'todoItem',
                        attrs: { checked: true },
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'sub todo',
                                marks: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'bulletList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'list item',
                        marks: []
                      }
                    ]
                  },
                  {
                    type: 'todoList',
                    attrs: {
                      bullet: '-'
                    },
                    content: [
                      {
                        type: 'todoItem',
                        attrs: { checked: true },
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'sub todo',
                                marks: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    type: 'bulletList',
                    attrs: {
                      bullet: '-'
                    },
                    content: [
                      {
                        type: 'listItem',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'sub list item',
                                marks: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'nested todos',
      markdown: `# nested todos
- [ ] todo
  - [x] sub todo
`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, marker: '#' },
            content: [
              {
                type: 'text',
                text: 'nested todos',
                marks: []
              }
            ]
          },
          {
            type: 'todoList',
            attrs: {
              bullet: '-'
            },
            content: [
              {
                type: 'todoItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'todo',
                        marks: []
                      }
                    ]
                  },
                  {
                    type: 'todoList',
                    attrs: {
                      bullet: '-'
                    },
                    content: [
                      {
                        type: 'todoItem',
                        attrs: { checked: true },
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'sub todo',
                                marks: []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: 'mermaid diagram',
      markdown: '```mermaid\ngraph TD;\n\tA-->B;\n\tA-->C;\n\tB-->D;\n\tC-->D;\n```',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'mermaid',
            attrs: {
              language: 'mermaid'
            },
            content: [
              {
                marks: [],
                text: 'graph TD;\n\tA-->B;\n\tA-->C;\n\tB-->D;\n\tC-->D;',
                type: 'text'
              }
            ]
          }
        ]
      }
    },
    {
      name: 'embed',
      markdown: '<a href="http://localhost/embed" data-type="embed">http:&#x2F;&#x2F;localhost&#x2F;embed</a>',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'embed',
                attrs: { src: 'http://localhost/embed' },
                content: []
              }
            ]
          }
        ]
      }
    },
    {
      name: 'embed-uri-escape',
      markdown:
        '<a href="http://localhost/embed%20spaces" data-type="embed">http:&#x2F;&#x2F;localhost&#x2F;embed spaces</a>',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'embed',
                attrs: { src: 'http://localhost/embed spaces' },
                content: []
              }
            ]
          }
        ]
      }
    },
    {
      name: 'embed-html-escape',
      markdown:
        '<a href="http://localhost/embed%3Chtml%3E" data-type="embed">http:&#x2F;&#x2F;localhost&#x2F;embed&lt;html&gt;</a>',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'embed',
                attrs: { src: 'http://localhost/embed<html>' },
                content: []
              }
            ]
          }
        ]
      }
    },
    {
      name: 'multiline image alt',
      markdown: '![line0\\\n\\\nline1](http://example.com/image.png)',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'image',
                attrs: { src: 'http://example.com/image.png', alt: 'line0\n\nline1' },
                content: []
              }
            ]
          }
        ]
      }
    },
    {
      name: 'image in a table cell',
      markdown:
        '<table><tbody><tr><td><p>Some text</p><p> <img src="files/image_1.png" alt="image-alt"/></p></td></tr></tbody></table>',
      markup: {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: undefined,
                      rowspan: undefined,
                      colwidth: undefined
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'text',
                            text: 'Some text'
                          }
                        ]
                      },
                      {
                        type: 'paragraph',
                        attrs: {
                          textAlign: null
                        },
                        content: [
                          {
                            type: 'text',
                            text: ' '
                          },
                          {
                            type: 'image',
                            attrs: {
                              src: 'files/image_1.png',
                              alt: 'image-alt',
                              'file-id': null,
                              title: null
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]

  describe('to markup', () => {
    tests.forEach(({ name, markdown, markup }) => {
      it(name, () => {
        const parsed = markdownToMarkup(markdown, options)
        expect(parsed).toEqual(markup)
      })
    })
  })

  describe('to markup and back', () => {
    tests.forEach(({ name, markdown, markup }) => {
      it(name, () => {
        const json = markdownToMarkup(markdown, options)
        const serialized = markupToMarkdown(json, options)
        expect(serialized).toEqualMarkdown(markdown)
      })
    })
  })
})

describe('markupToMarkdown', () => {
  const tests: Array<{ name: string, markdown: string, markup: object }> = [
    {
      name: 'links',
      markdown: `[Link](https://example.com)

[Link with spaces](<https://example.com/with spaces>)

[Link with spaces and braces](<https://example.com/\\<with spaces\\>>)`,
      markup: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Link',
                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }]
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Link with spaces',
                marks: [{ type: 'link', attrs: { href: 'https://example.com/with spaces' } }]
              }
            ]
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Link with spaces and braces',
                marks: [{ type: 'link', attrs: { href: 'https://example.com/<with spaces>' } }]
              }
            ]
          }
        ]
      }
    }
  ]

  describe('to markdown', () => {
    tests.forEach(({ name, markdown, markup }) => {
      it(name, () => {
        const result = markupToMarkdown(markup as MarkupNode, options)
        expect(result).toEqual(markdown)
      })
    })
  })
})

describe('markdownToMarkup -> markupToMarkdown', () => {
  const tests: Array<{ name: string, markdown: string, alternate?: string }> = [
    { name: 'Italic', markdown: '*Asteriscs* and _Underscores_' },
    { name: 'Bold', markdown: '**Asteriscs** and __Underscores__' },
    { name: 'Bullet list with asteriscs', markdown: 'Asterisks :\r\n* Firstly\r\n* Secondly' },
    { name: 'Bullet list with dashes', markdown: 'Dashes :\r\n- Firstly\r\n- Secondly' },
    { name: 'TODO list with asteriscs', markdown: '* [ ] Take\n* [ ] Do\n\n' },
    { name: 'TODO list with dashes', markdown: '- [x] Take\n- [ ] Do\n\n' },
    {
      name: 'Different markers',
      markdown:
        'Asterisks bulleted list:\r\n* Asterisks: *Italic* and  **Bold*** Underscores: _Italic_ and __Bold__\r\n\r\nDash bulleted list:\r\n- Asterisks: *Italic* and  **Bold**\r\n- Underscores: _Italic_ and __Bold__\r\n-'
    },
    { name: 'Single line comment', markdown: '<!-- Do not erase me -->' },
    {
      name: 'Multsiline comment',
      markdown:
        '"<!--\r\n\r\nPlease title your PR as follows: `module: description` (e.g. `time: fix date format`).\r\nAlways start with the thing you are fixing, then describe the fix.\r\nDon\'t use past tense (e.g. "fixed foo bar").\r\n\r\nExplain what your PR does and why.\r\n\r\nIf you are adding a new function, please document it and add tests:\r\n\r\n```\r\n// foo does foo and bar\r\nfn foo() {\r\n\r\n// file_test.v\r\nfn test_foo() {\r\n    assert foo() == ...\r\n    ...\r\n}\r\n```\r\n\r\nIf you are fixing a bug, please add a test that covers it.\r\n\r\nBefore submitting a PR, please run `v test-all` .\r\nSee also `TESTS.md`.\r\n\r\nI try to process PRs as soon as possible. They should be handled within 24 hours.\r\n\r\nApplying labels to PRs is not needed.\r\n\r\nThanks a lot for your contribution!\r\n\r\n-->\r\n\r\nThis PR fix issue #22424\r\n\r\n\r\n"'
    },
    {
      name: 'Link',
      markdown: 'See [link](https://example.com)'
    },
    {
      name: 'Link with spaces',
      markdown: 'See [link](<https://example.com/with spaces>)',
      alternate: 'See [link](https://example.com/with%20spaces)'
    },
    {
      name: 'Link with spaces and braces',
      markdown: 'See [link](<https://example.com/\\<with spaces\\>>)',
      alternate: 'See [link](https://example.com/%3Cwith%20spaces%3E)'
    },
    {
      name: 'Codeblock',
      markdown: '```typescript\nconst x: number = 42;\n```'
    },
    {
      name: 'Image',
      markdown: '<img width="320" height="160" src="http://example.com/image" alt="image">'
    },
    {
      name: 'Images',
      markdown: `
<img width="250" height="330" src="https://github.com/user-attachments/assets/f348e016-3f7d-45b1-b8a0-9098e9961885" alt="Screenshot 2025-09-11 at 15 42 40" />

<img width="250" height="230" alt="Screenshot 2025-09-11 at 15 43 42" src="https://github.com/user-attachments/assets/4502eba1-1f55-44df-b691-c4d3d3d3d67d" >

<img src="https://github.com/user-attachments/assets/e21431a3-2062-4b0b-9c8f-d06c92ede741" alt="Screenshot 2025-09-11 at 15 43 50" width="250" height="210" >`
    },
    {
      name: 'Image with multiline alt',
      markdown: '![link0\\\n\\\nline1](http://example.com/image.png)'
    },
    {
      name: 'Table',
      markdown:
        '<table><tbody><tr><th><p>Header 1</p></th><th><p>Header 2</p></th></tr><tr><td><p>Cell 1</p></td><td><p>Cell 2</p></td></tr><tr><td><p>Cell 3</p></td><td><p>Cell 4</p></td></tr></tbody></table>'
    },
    {
      name: 'Complex table',
      markdown:
        '<table><tbody><tr><td colspan="2" colwidth="320"><p>Header</p></td></tr><tr><td rowspan="2"><p>Cell 1</p></td><td><p>Cell 2</p></td></tr><tr><td><p>Cell 3</p></td></tr></tbody></table>'
    },
    {
      name: 'Sub',
      markdown: '<sub>View in Huly <a href="http://localhost:8080/guest/github?token=token">TSK-50</a></sub>'
    }
    // {
    //   name: 'Malformed',
    //   markdown: '<foo>try to parse me</bar></buzz>'
    // }
  ]

  tests.forEach(({ name, markdown, alternate }) => {
    it(name, () => {
      const json = markdownToMarkup(markdown, options)
      const serialized = markupToMarkdown(json, options)
      expect(serialized).toEqualMarkdown(alternate ?? markdown)
    })
  })
})
