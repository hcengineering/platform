//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
import { readFile } from 'fs/promises'
import { extractDocument } from '../process'

describe('pdf-parse', () => {
  it('check hh6', async () => {
    const data = await readFile('./demo/pdf6.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.firstName).toBe('Виктория')
    expect(resume.lastName).toBe('Бондаренко')
    expect(resume.email).toBe('wika.schneider@mail.ru')
    expect(resume.phone).toBe('+7 952 929 53 49')
  })
  it('check hh5', async () => {
    const data = await readFile('./demo/pdf5.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.firstName).toBe('Александр')
    expect(resume.lastName).toBe('Сизых')
    expect(resume.city).toBe('Томск')
    expect(resume.email).toBe('alexsneezy@gmail.com')
    expect(resume.phone).toBe('+7 953 920 11 22')
    expect(resume.skype).toBe('https://join.skype.com/invite/hDFFG9b7tvRb')
    expect(resume.linkedin).toBe('http://linkedin.com/in/asizykh')
  })
  it('check hh4', async () => {
    const data = await readFile('./demo/pdf4.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.firstName).toBe('Алексей Владимирович')
    expect(resume.lastName).toBe('Пешков')
    expect(resume.city).toBe('Москва, м. Тимирязевская')
    expect(resume.email).toBe('aleks.peshkov@gmail.com')
  })

  it('check hh3', async () => {
    const data = await readFile('./demo/pdf3.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.firstName).toBe('Ильнур')
    expect(resume.lastName).toBe('Сербаев')
    expect(resume.phone).toBe('+7 917 049 18 13')
    expect(resume.skype).toBe('serbaevilnur')
    expect(resume.city).toBe('Уфа')
    expect(resume.email).toBe('serbaevilnur@gmail.com')
  })

  it('check hh2', async () => {
    const data = await readFile('./demo/pdf2.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.firstName).toBe('Дмитрий')
    expect(resume.lastName).toBe('Войтенко')
    expect(resume.phone).toBe('+7 960 986 12 95')
    expect(resume.email).toBe('13unconnected37@gmail.com')
    expect(resume.city).toBe('Новосибирск, м. Золотая нива')
  })

  it('check podbor', async () => {
    const data = await readFile('./demo/pdf1.pdf')
    const { resume } = await extractDocument(data)

    expect(resume.firstName).toBe('Sergey')
    expect(resume.lastName).toBe('Ushnurtsev')
    expect(resume.email).toBe('oceanite@yandex.ru')
    expect(resume.city).toBe('Москва')
    expect(resume.github).toBe('https://github.com/sergggio')
  })
})
