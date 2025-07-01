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
import { htmlToMarkup, markupToHtml } from '..'

const tests: Array<{ name: string, markup: object, html: string }> = [
  {
    name: 'paragraph',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'paragraph 1'
            }
          ]
        }
      ]
    },
    html: '<p>paragraph 1</p>'
  },
  {
    name: 'text alignment',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {
            level: 1,
            textAlign: 'left'
          },
          content: [
            {
              type: 'text',
              text: 'heading 1'
            }
          ]
        },
        {
          type: 'paragraph',
          attrs: {
            textAlign: 'right'
          },
          content: [
            {
              type: 'text',
              text: 'paragraph 1'
            }
          ]
        }
      ]
    },
    html: '<h1 style="text-align: left">heading 1</h1><p style="text-align: right">paragraph 1</p>'
  },
  {
    name: 'headings',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {
            level: 1,
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'heading 1'
            }
          ]
        },
        {
          type: 'heading',
          attrs: {
            level: 2,
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'heading 2'
            }
          ]
        },
        {
          type: 'heading',
          attrs: {
            level: 3,
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'heading 3'
            }
          ]
        },
        {
          type: 'heading',
          attrs: {
            level: 4,
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'heading 4'
            }
          ]
        },
        {
          type: 'heading',
          attrs: {
            level: 5,
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'heading 5'
            }
          ]
        },
        {
          type: 'heading',
          attrs: {
            level: 6,
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'heading 6'
            }
          ]
        }
      ]
    },
    html: '<h1>heading 1</h1><h2>heading 2</h2><h3>heading 3</h3><h4>heading 4</h4><h5>heading 5</h5><h6>heading 6</h6>'
  },
  {
    name: 'blockquote',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              attrs: {
                textAlign: null
              },
              content: [
                {
                  type: 'text',
                  text: 'Lorem ipsum dolor sit amet.'
                }
              ]
            }
          ]
        }
      ]
    },
    html: '<blockquote><p>Lorem ipsum dolor sit amet.</p></blockquote>'
  },
  {
    name: 'codeblock',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: {
            language: 'typescript'
          },
          content: [
            {
              type: 'text',
              text: 'const x: number = 42;'
            }
          ]
        }
      ]
    },
    html: '<pre><code class="language-typescript">const x: number = 42;</code></pre>'
  },
  {
    name: 'hr',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'paragraph 1'
            }
          ]
        },
        {
          type: 'horizontalRule'
        },
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'paragraph 2'
            }
          ]
        }
      ]
    },
    html: '<p>paragraph 1</p><hr/><p>paragraph 2</p>'
  },
  {
    name: 'br',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'line 1'
            },
            {
              type: 'hardBreak'
            },
            {
              type: 'text',
              text: 'line 2'
            }
          ]
        }
      ]
    },
    html: '<p>line 1<br/>line 2</p>'
  },
  {
    name: 'ordered list',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: {
            start: 1
          },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: null
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'item 1'
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
                  attrs: {
                    textAlign: null
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'item 2'
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
                  attrs: {
                    textAlign: null
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'item 3'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    html: '<ol><li><p>item 1</p></li><li><p>item 2</p></li><li><p>item 3</p></li></ol>'
  },
  {
    name: 'bullet list',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  attrs: {
                    textAlign: null
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'item 1'
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
                  attrs: {
                    textAlign: null
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'item 2'
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
                  attrs: {
                    textAlign: null
                  },
                  content: [
                    {
                      type: 'text',
                      text: 'item 3'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    html: '<ul><li><p>item 1</p></li><li><p>item 2</p></li><li><p>item 3</p></li></ul>'
  },
  {
    name: 'ref',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'hello '
            },
            {
              type: 'reference',
              attrs: {
                id: '64708c79c8f2613474dea38b',
                objectclass: 'contact:class:Person',
                label: 'John Doe'
              }
            }
          ]
        }
      ]
    },
    html: '<p>hello <span data-type="reference" data-id="64708c79c8f2613474dea38b" data-objectclass="contact:class:Person" data-label="John Doe">@John Doe</span></p>'
  },
  {
    name: 'embed',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'hello '
            },
            {
              type: 'embed',
              attrs: {
                src: 'http://localhost/embed'
              }
            }
          ]
        }
      ]
    },
    html: '<p>hello <a href="http://localhost/embed" data-type="embed">http://localhost/embed</a></p>'
  },
  {
    name: 'embed-uri-escape',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'hello '
            },
            {
              type: 'embed',
              attrs: {
                src: 'http://localhost/embed spaces'
              }
            }
          ]
        }
      ]
    },
    html: '<p>hello <a href="http://localhost/embed%20spaces" data-type="embed">http://localhost/embed spaces</a></p>'
  },
  {
    name: 'embed-html-escape',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'hello '
            },
            {
              type: 'embed',
              attrs: {
                src: 'http://localhost/embed<html>'
              }
            }
          ]
        }
      ]
    },
    html: '<p>hello <a href="http://localhost/embed%3Chtml%3E" data-type="embed">http://localhost/embed&lt;html&gt;</a></p>'
  },
  {
    name: 'link-with-class',
    markup: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            textAlign: null
          },
          content: [
            {
              type: 'text',
              text: 'https://example.com',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'cursor-pointer',
                    title: undefined
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    html: '<p><a target="_blank" rel="noopener noreferrer" class="cursor-pointer" href="https://example.com">https://example.com</a></p>'
  }
]

describe('markupToHtml', () => {
  describe('convert to html', () => {
    tests.forEach(({ name, markup, html }) => {
      it(name, () => {
        const result = markupToHtml(markup as MarkupNode)
        expect(result).toEqual(html)
      })
    })
  })
})

describe('htmlToMarkup', () => {
  describe('convert to markup', () => {
    tests.forEach(({ name, markup, html }) => {
      it(name, () => {
        const result = htmlToMarkup(html)
        expect(result).toEqual(markup)
      })
    })
  })

  describe('convert to markup and back', () => {
    tests.forEach(({ name, markup, html }) => {
      it(name, () => {
        const result = htmlToMarkup(html)
        const serialized = markupToHtml(result)
        expect(serialized).toEqual(html)
      })
    })
  })
})
