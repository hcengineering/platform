import { convertArrayParams, decodeArray, filterProjection } from '../utils'

describe('array conversion', () => {
  it('should handle undefined parameters', () => {
    expect(convertArrayParams(undefined)).toBeUndefined()
  })

  it('should convert empty arrays', () => {
    expect(convertArrayParams([['foo']])).toEqual(['{"foo"}'])
    expect(convertArrayParams([[]])).toEqual(['{}'])
  })

  it('should handle string arrays with special characters', () => {
    expect(convertArrayParams([['hello', 'world"quote"']])).toEqual(['{"hello","world\\"quote\\""}'])
  })

  it('should handle null values', () => {
    expect(convertArrayParams([[null, 'value', null]])).toEqual(['{NULL,"value",NULL}'])
  })

  it('should handle mixed type arrays', () => {
    expect(convertArrayParams([[123, 'text', null, true]])).toEqual(['{123,"text",NULL,true}'])
  })

  it('should pass through non-array parameters', () => {
    expect(convertArrayParams(['text', 123, null])).toEqual(['text', 123, null])
  })
})

describe('array decoding', () => {
  it('should decode NULL to empty array', () => {
    expect(decodeArray('NULL')).toEqual([])
  })

  it('should decode empty array', () => {
    expect(decodeArray('{}')).toEqual([''])
  })

  it('should decode simple string array', () => {
    expect(decodeArray('{hello,world}')).toEqual(['hello', 'world'])
  })
  it('should decode encoded string array', () => {
    expect(decodeArray('{"hello","world"}')).toEqual(['hello', 'world'])
  })

  it('should decode array with quoted strings', () => {
    expect(decodeArray('{hello,"quoted value"}')).toEqual(['hello', 'quoted value'])
  })

  it('should decode array with escaped quotes', () => {
    expect(decodeArray('{"hello \\"world\\""}')).toEqual(['hello "world"'])
  })

  it('should decode array with multiple escaped characters', () => {
    expect(decodeArray('{"first \\"quote\\"","second \\"quote\\""}')).toEqual(['first "quote"', 'second "quote"'])
  })
})

describe('projection', () => {
  it('mixin query projection', () => {
    const data = {
      '638611f18894c91979399ef3': {
        Источник_6386125d8894c91979399eff: 'Workable'
      },
      attachments: 1,
      avatar: null,
      avatarProps: null,
      avatarType: 'color',
      channels: 3,
      city: 'Poland',
      docUpdateMessages: 31,
      name: 'Mulkuha,Muklyi',
      'notification:mixin:Collaborators': {
        collaborators: []
      },
      'recruit:mixin:Candidate': {
        Title_63f38419efefd99805238bbd: 'Backend-RoR',
        Trash_64493626f9b50e77bf82d231: 'Нет',
        __mixin: 'true',
        applications: 1,
        onsite: null,
        remote: null,
        skills: 18,
        title: '',
        Опытработы_63860d5c8894c91979399e73: '2018',
        Уровеньанглийского_63860d038894c91979399e6f: 'UPPER'
      }
    }
    const projected = filterProjection<any>(data, {
      'recruit:mixin:Candidate.Уровеньанглийского_63860d038894c91979399e6f': 1,
      _class: 1,
      space: 1,
      modifiedOn: 1
    })
    expect(projected).toEqual({
      'recruit:mixin:Candidate': {
        Уровеньанглийского_63860d038894c91979399e6f: 'UPPER'
      }
    })
  })
})
