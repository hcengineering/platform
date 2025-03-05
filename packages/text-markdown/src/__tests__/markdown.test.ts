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
          ? `Expected markdown strings NOT to be equal:\n Received: ${received}\n Expected: ${expected}`
          : `Expected markdown strings to be equal:\n Received: ${received}\n Expected: ${expected}`,
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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
            attrs: { level: 1 },
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

describe('markdownToMarkup -> markupToMarkdown', () => {
  const tests: Array<{ name: string, markdown: string }> = [
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
      name: 'Codeblock',
      markdown: '```typescript\nconst x: number = 42;\n```'
    },
    {
      name: 'Image',
      markdown: '<img width="320" height="160" src="http://example.com/image" alt="image">'
    },
    {
      name: 'Table',
      markdown:
        '<table><tbody><tr><th><p>Header 1</p></th><th><p>Header 2</p></th></tr><tr><td><p>Cell 1</p></td><td><p>Cell 2</p></td></tr><tr><td><p>Cell 3</p></td><td><p>Cell 4</p></td></tr></tbody></table>'
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

  tests.forEach(({ name, markdown }) => {
    it(name, () => {
      const json = markdownToMarkup(markdown, options)
      const serialized = markupToMarkdown(json, options)
      expect(serialized).toEqualMarkdown(markdown)
    })
  })
})
