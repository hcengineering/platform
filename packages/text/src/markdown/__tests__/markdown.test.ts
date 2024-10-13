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

import { ServerKit } from '../../kits/server-kit'
import { parseMessageMarkdown } from '..'

const refUrl: string = 'ref://'
const imageUrl: string = 'http://localhost'

const extensions = [ServerKit]

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

describe('markdown', () => {
  tests.forEach(({ name, markdown, markup }) => {
    it(name, () => {
      const parsed = parseMessageMarkdown(markdown, refUrl, imageUrl, extensions)
      expect(parsed).toEqual(markup)
    })
  })
})
