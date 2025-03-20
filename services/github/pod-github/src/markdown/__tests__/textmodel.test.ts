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
import {
  MarkupMarkType,
  MarkupNode,
  MarkupNodeType,
  jsonToMarkup,
  traverseAllMarks,
  traverseNode
} from '@hcengineering/text'
import { MarkdownState } from '@hcengineering/text-markdown'
import { markdownToMarkup, markupToMarkdown, parseMessageMarkdown, serializeMessage } from '..'

describe('server', () => {
  it('todos serialize and back', async () => {
    const markdown = `# Contribution checklist

## Brief description

## Checklist

* [ ] - Are screenshots added to PR if applicable?
* [x] - Does the code work as expected and all the requirements in the task are covered?
* [x] - Are all new user-facing texts added through the translations mechanism?
* [x] - Are all of the requirements in the task well tested?
* [x] - Tested in Chrome?
* [x] - Tested in Safari?
* [x] - Have you checked the new code for typos, TODOs, commented LOCs, debug code, etc.?
* [x] - Ensure your branch is up to date with the \`main\` branch
* [x] - Is there any redundant or duplicate code?
* [x] - Are required links added to PR?
* [x] - Is the new code well documented?

## Related issues

A list of closed updated issues`
    const markup = markdownToMarkup(markdown)
    const markdownAgain = await markupToMarkdown(markup)
    expect(markdownAgain).toBe(markdown)
  })

  it('html to markdown with links', async () => {
    const data = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'As a part of the Platform it would be nice to have an '
            },
            {
              type: MarkupNodeType.text,
              text: 'effect',
              marks: [{ type: MarkupMarkType.code, attrs: {} }]
            },
            {
              type: MarkupNodeType.text,
              text: ' subsystem. Something similar to '
            },
            {
              type: MarkupNodeType.text,
              text: 'https://www.effect.website',
              marks: [
                {
                  type: MarkupMarkType.link,
                  attrs: {
                    href: 'https://www.effect.website'
                  }
                }
              ]
            }
          ]
        }
      ]
    })
    const markDownData = await markupToMarkdown(data)
    expect(markDownData).toEqual(
      'As a part of the Platform it would be nice to have an `effect` subsystem. Something similar to <https://www.effect.website>'
    )
  })

  it('html to markdown with links-2', async () => {
    const data = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'As a part of the Platform it would be nice to have an '
            },
            {
              type: MarkupNodeType.text,
              text: 'effect',
              marks: [{ type: MarkupMarkType.code, attrs: {} }]
            },
            {
              type: MarkupNodeType.text,
              text: ' subsystem. Something similar to '
            },
            {
              type: MarkupNodeType.text,
              text: 'Effects',
              marks: [
                {
                  type: MarkupMarkType.link,
                  attrs: {
                    href: 'https://www.effect.website'
                  }
                }
              ]
            }
          ]
        }
      ]
    })
    const markDownData = await markupToMarkdown(data)
    expect(markDownData).toEqual(
      'As a part of the Platform it would be nice to have an `effect` subsystem. Something similar to [Effects](https://www.effect.website)'
    )
  })

  it('markup to markdown', async () => {
    const data = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: '629d8b615bdc96430ced15a0',
                objectclass: 'contact:class:Person',
                label: 'Sobolev Andrey'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' '
            },
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: '64db123e602161ac4482475c',
                objectclass: 'github:class:GithubPullRequest',
                label: 'UBERF-16'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' link test'
            }
          ]
        }
      ]
    })
    const data2 =
      '[Sobolev Andrey](https://front.hc.engineering/open/?workspace=workspace&_class=contact%3Aclass%3APerson&_id=629d8b615bdc96430ced15a0&label=Sobolev%20Andrey) [UBERF-16](https://front.hc.engineering/open/?workspace=workspace&_class=github%3Aclass%3AGithubPullRequest&_id=64db123e602161ac4482475c&label=UBERF-16) link test'
    const html = await markupToMarkdown(data, 'https://front.hc.engineering/open/?workspace=workspace')
    expect(html).toEqual(data2)
  })

  it('markdown to markup', () => {
    const data =
      '[Sobolev Andrey](https://front.hc.engineering/open/?workspace=workspace&_class=contact%3Aclass%3APerson&_id=629d8b615bdc96430ced15a0&label=Sobolev%20Andrey) [UBERF-16](https://front.hc.engineering/open/?workspace=workspace&_class=github%3Aclass%3AGithubPullRequest&_id=64db123e602161ac4482475c&label=UBERF-16) link test'
    const data2 = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.reference,
              content: [
                {
                  type: MarkupNodeType.text,
                  text: 'Sobolev Andrey',
                  marks: []
                }
              ],
              attrs: {
                label: 'Sobolev Andrey',
                id: '629d8b615bdc96430ced15a0',
                objectclass: 'contact:class:Person'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' ',
              marks: []
            },
            {
              type: MarkupNodeType.reference,
              content: [
                {
                  type: MarkupNodeType.text,
                  text: 'UBERF-16',
                  marks: []
                }
              ],
              attrs: {
                label: 'UBERF-16',
                id: '64db123e602161ac4482475c',
                objectclass: 'github:class:GithubPullRequest'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' link test',
              marks: []
            }
          ]
        }
      ]
    })
    const markup = markdownToMarkup(data, 'https://front.hc.engineering/open/?workspace=workspace')
    expect(markup).toEqual(data2)
  })

  it('test conversion', async () => {
    const data = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'Yahoo',
              marks: [{ type: MarkupMarkType.bold, attrs: {} }]
            },
            {
              type: MarkupNodeType.text,
              text: ' something is strange'
            },
            {
              type: MarkupNodeType.hard_break
            },
            {
              type: MarkupNodeType.text,
              text: 'some more line 2'
            }
          ]
        },
        {
          type: MarkupNodeType.heading,
          attrs: {
            level: 2
          },
          content: [
            {
              type: MarkupNodeType.text,
              text: 'Header'
            }
          ]
        },
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'Test 3'
            },
            {
              type: MarkupNodeType.hard_break
            },
            {
              type: MarkupNodeType.hard_break
            }
          ]
        },
        {
          type: MarkupNodeType.bullet_list,
          content: [
            {
              type: MarkupNodeType.list_item,
              content: [
                {
                  type: MarkupNodeType.paragraph,
                  content: [
                    {
                      type: MarkupNodeType.text,
                      text: 'qeqwe'
                    }
                  ]
                }
              ]
            },
            {
              type: MarkupNodeType.list_item,
              content: [
                {
                  type: MarkupNodeType.paragraph,
                  content: [
                    {
                      type: MarkupNodeType.text,
                      text: 'qwewqe'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: MarkupNodeType.paragraph
        },
        {
          type: MarkupNodeType.taskList,
          content: [
            {
              type: MarkupNodeType.taskItem,
              attrs: {
                checked: 'false'
              },
              content: [
                {
                  type: MarkupNodeType.paragraph,
                  content: [
                    {
                      type: MarkupNodeType.text,
                      text: 'qweqwewq'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
    const markdown = await markupToMarkdown(data, 'https://front.hc.engineering/open/?workspace=workspace')
    const markup = markdownToMarkup(markdown, 'https://front.hc.engineering/open/?workspace=workspace')
    console.log(markdown, markup)
  })

  it('Check parsing header', () => {
    const t1 = '# This is header'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })
  it('Check parsing bullets', () => {
    const t1 = '* Section A\n  Some text\n* Section B\n  Some more text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })
  it('Check parsing bullets-2', () => {
    const t1 = '* Section A\n* Some section2'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('* Section A\n* Some section2')
  })

  it('Check ordered list', () => {
    const t1 = '1. Section A\n   Some text\n2. Section B\n   Some more text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.ordered_list)
    expect(msg.content?.[0].content?.[0].type).toEqual(MarkupNodeType.list_item)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check styles', () => {
    const t1 = '**BOLD _ITALIC_ BOLD**'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check styles-2', () => {
    const t1 = '**BOLD *ITALIC* BOLD**'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check styles-3', () => {
    const t1 = 'Some *EM **MORE EM***'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.paragraph)
    expect(msg.content?.[0].content?.length).toEqual(3)
    expect(msg.content?.[0].content?.[2]?.marks?.length).toEqual(2)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check hardbreaks', () => {
    const t1 = 'foo\\\nbaz'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.[0].type).toEqual(MarkupNodeType.text)
    expect(msg.content?.[0].content?.[1].type).toEqual(MarkupNodeType.hard_break)
    expect(msg.content?.[0].content?.[2].type).toEqual(MarkupNodeType.text)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('foo\\\nbaz')
  })

  it('Check hardbreaks with spaces', () => {
    const t1 = 'foo  \nbaz'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.[0].type).toEqual(MarkupNodeType.text)
    expect(msg.content?.[0].content?.[1].type).toEqual(MarkupNodeType.hard_break)
    expect(msg.content?.[0].content?.[2].type).toEqual(MarkupNodeType.text)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('foo\\\nbaz')
  })

  it('Check softbreaks', () => {
    const t1 = 'foo\nbaz'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.[0].type).toEqual(MarkupNodeType.text)
    expect(msg.content?.[0].content?.[0].text).toEqual('foo\nbaz')

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('foo\nbaz')
  })

  it('Check softbreaks with spaces', () => {
    const t1 = 'foo \n baz'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.[0].type).toEqual(MarkupNodeType.text)
    expect(msg.content?.[0].content?.[0].text).toEqual('foo\nbaz')

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('foo\nbaz')
  })

  it('Check images', () => {
    const t1 = 'Some text\nsome text ![This is Alt](http://url/a.png "This is title") Some text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.[1].type).toEqual(MarkupNodeType.image)
    expect(msg.content?.[0].content?.[1].attrs?.src).toEqual('http://url/a.png')
    expect(msg.content?.[0].content?.[1].attrs?.title).toEqual('This is title')

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check block quote', () => {
    const t1 = '> Some quoted text\nand some more text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.blockquote)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('> Some quoted text\n> and some more text')
  })

  it('Check block quote-2', () => {
    const t1 = '> Some quoted text\n> and some more text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.blockquote)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })
  it('Check block quote-3', () => {
    const t1 = '> Some quoted text\n\nand some more text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.blockquote)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check code block', () => {
    const t1 = "```\n# code block\nprint '3 backticks or'\nprint 'indent 4 spaces'\n```"
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.code_block)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check inline block', () => {
    const t1 = 'Hello `Some code` block'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.paragraph)
    expect(msg.content?.[0].content?.length).toEqual(3)
    expect(msg.content?.[0].content?.[1].marks?.[0].type).toEqual(MarkupMarkType.code)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check underline heading rule', () => {
    const t1 = 'Hello\n---\n\nSome text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('Hello\n---\n\nSome text')
  })

  it('Check horizontal line', () => {
    const t1 = 'Hello\n\n---\n\nSome text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.length).toEqual(3)
    expect(msg.content?.[1].type).toEqual(MarkupNodeType.horizontal_rule)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check big inline block', () => {
    const t1 = 'Hello ```Some code``` block'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.paragraph)
    expect(msg.content?.[0].content?.length).toEqual(3)
    expect(msg.content?.[0].content?.[1].marks?.[0].type).toEqual(MarkupMarkType.code)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual('Hello `Some code` block')
  })
  it('Check code block language', () => {
    const t1 = "```typescript\n# code block\nprint '3 backticks or'\nprint 'indent 4 spaces'\n```"
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].type).toEqual(MarkupNodeType.code_block)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check link', () => {
    const t1 = 'Some text [Link Alt](http://a.com) some more text'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })
  it('Check link bold', () => {
    const t1 = '**[link](foo) is bold**"'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.[1].marks?.[0]?.type).toEqual(MarkupMarkType.bold)
    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })

  it('Check overlapping inline marks', () => {
    const t1 = 'This is **strong *emphasized text with `code` in* it**'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.length).toEqual(6)

    const md = serializeMessage(msg, 'ref://', 'http://')

    expect(md).toEqual(t1)
  })
  it('Check emph url', () => {
    const t1 = 'Link to *<https://hardware.it>*'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg.type).toEqual(MarkupNodeType.doc)
    expect(msg.content?.[0].content?.length).toEqual(2)

    const md = serializeMessage(msg, 'ref://', 'http://')
    expect(md).toEqual('Link to *<https://hardware.it>*')
  })
  it('check header hard_break serialize', () => {
    const doc: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: '# Hello'
            },
            {
              type: MarkupNodeType.hard_break
            },
            {
              type: MarkupNodeType.text,
              text: 'World'
            }
          ]
        }
      ]
    }
    const md = serializeMessage(doc, 'ref://', 'http://')
    expect(md).toEqual('# Hello\\\nWorld')
  })
  it('Check inline html - 1', () => {
    const t1 = '<div><a href="bar">*foo*</a></div>'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg).toEqual({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          attrs: { textAlign: null },
          content: [
            {
              type: MarkupNodeType.text,
              text: '*foo*',
              marks: [
                {
                  type: MarkupMarkType.link,
                  attrs: {
                    href: 'bar',
                    class: 'cursor-pointer',
                    rel: 'noopener noreferrer',
                    target: '_blank'
                  }
                }
              ]
            }
          ]
        }
      ]
    })
  })
  it('Check inline html - 2', () => {
    const t1 = '<h1>hello</h1>\n<h2>world</h2>'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg).toEqual({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.heading,
          attrs: { level: 1, textAlign: null },
          content: [
            {
              type: MarkupNodeType.text,
              text: 'hello'
            }
          ]
        },
        {
          type: MarkupNodeType.paragraph,
          attrs: { textAlign: null },
          content: [
            {
              text: '\n',
              type: MarkupNodeType.text
            }
          ]
        },
        {
          type: MarkupNodeType.heading,
          attrs: { level: 2, textAlign: null },
          content: [
            {
              type: MarkupNodeType.text,
              text: 'world'
            }
          ]
        }
      ]
    })
  })

  it('Check inline html - 3', () => {
    const t1 = '* line 1\n* line 2\n  <img width="320" src="http://example.com/image" alt="image">'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')
    expect(msg).toEqual({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.bullet_list,
          attrs: {
            bullet: '*'
          },
          content: [
            {
              type: MarkupNodeType.list_item,
              content: [
                {
                  type: MarkupNodeType.paragraph,
                  content: [
                    {
                      type: MarkupNodeType.text,
                      text: 'line 1',
                      marks: []
                    }
                  ]
                }
              ]
            },
            {
              type: MarkupNodeType.list_item,
              content: [
                {
                  type: MarkupNodeType.paragraph,
                  content: [
                    {
                      type: MarkupNodeType.text,
                      text: 'line 2\n',
                      marks: []
                    },
                    {
                      type: MarkupNodeType.image,
                      attrs: {
                        src: 'http://example.com/image',
                        alt: 'image',
                        width: 320,
                        align: null,
                        height: null,
                        title: null,
                        'file-id': null,
                        'data-file-type': null
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  })

  it('Check traverse', () => {
    const t1 = '**[link](foo) is bold**"'
    const msg = parseMessageMarkdown(t1, 'ref://', 'http://', 'http://')

    const nodes = []
    traverseNode(msg, (node) => {
      nodes.push(node)
      return true
    })
    expect(nodes.length).toEqual(5)
    const marks = []
    traverseAllMarks(msg, (node, mark) => {
      marks.push(mark)
    })
    expect(marks.length).toEqual(3)
  })

  it('check serialize variant', () => {
    const node: MarkupNode = {
      content: [
        {
          content: [
            {
              content: [
                {
                  content: [
                    { text: 'test1 ', type: MarkupNodeType.text },
                    { text: undefined, type: MarkupNodeType.hard_break },
                    {
                      text: 'Italic',
                      marks: [{ type: MarkupMarkType.em, attrs: [] }],
                      type: MarkupNodeType.text
                    }
                  ],
                  type: MarkupNodeType.paragraph
                }
              ],
              type: MarkupNodeType.list_item
            },
            {
              content: [
                {
                  content: [
                    { text: 'test2 ', type: MarkupNodeType.text },
                    { text: 'BOLD', marks: [{ type: MarkupMarkType.bold, attrs: [] }], type: MarkupNodeType.text }
                  ],
                  type: MarkupNodeType.paragraph
                }
              ],
              type: MarkupNodeType.list_item
            }
          ],
          type: MarkupNodeType.bullet_list
        }
      ],
      type: MarkupNodeType.doc
    }
    const msg = serializeMessage(node, 'ref://', 'http://')

    expect(msg).toEqual('* test1 \\\n  *Italic*\n* test2 **BOLD**')
  })
  it('check serialize throw unsupported', () => {
    const node: MarkupNode = {
      content: [
        {
          content: [
            {
              content: [
                {
                  content: [
                    { text: 'test1 ', type: MarkupNodeType.text },
                    { text: undefined, type: MarkupNodeType.text },
                    { text: undefined, type: (MarkupNodeType.text + 'qwe') as MarkupNodeType },
                    { text: undefined, type: MarkupNodeType.text }
                  ],
                  type: MarkupNodeType.paragraph
                }
              ],
              type: MarkupNodeType.list_item
            }
          ],
          type: MarkupNodeType.bullet_list
        }
      ],
      type: MarkupNodeType.doc
    }
    expect(() => serializeMessage(node, 'ref://', 'http://')).toThrowError(
      'Token type `textqwe` not supported by Markdown renderer'
    )
  })

  it('check markdown state', () => {
    const st = new MarkdownState()

    st.text('qwe', true)
    expect(st.out).toEqual('qwe')
  })

  it('check markdown state', () => {
    const st = new MarkdownState()

    const o1 = st.quote("qwe'")
    const o2 = st.quote('qwe"')
    expect(o1).toEqual('"qwe\'"')
    expect(o2).toEqual("'qwe\"'")
  })

  it('check horizontal rule', () => {
    const node: MarkupNode = {
      content: [
        {
          attrs: {},
          type: MarkupNodeType.horizontal_rule
        }
      ],
      type: MarkupNodeType.doc
    }
    expect(serializeMessage(node, 'ref://', 'http://')).toEqual('---')
  })

  it('check code_text', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'Link to '
            },
            {
              type: MarkupNodeType.text,
              text: 'https://hardware.it',
              marks: [
                {
                  type: MarkupMarkType.em,
                  attrs: {}
                },
                {
                  type: MarkupMarkType.link,
                  attrs: {
                    title: 'Some title',
                    href: 'https://hardware.it'
                  }
                }
              ]
            }
          ]
        }
      ]
    }
    expect(serializeMessage(node, 'ref://', 'http://')).toEqual(
      'Link to *[https://hardware.it](https://hardware.it "Some title")*'
    )
  })

  it('check swithc marks', () => {
    const node: MarkupNode = {
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.text,
              text: 'Link to ',
              marks: [
                {
                  type: MarkupMarkType.bold,
                  attrs: {}
                }
              ]
            },
            {
              type: MarkupNodeType.text,
              text: 'https://hardware.it',
              marks: [
                {
                  type: MarkupMarkType.em,
                  attrs: {}
                },
                {
                  type: MarkupMarkType.bold,
                  attrs: {}
                }
              ]
            }
          ]
        }
      ]
    }
    expect(serializeMessage(node, 'ref://', 'http://')).toEqual('**Link to *https://hardware.it***')
  })
})
