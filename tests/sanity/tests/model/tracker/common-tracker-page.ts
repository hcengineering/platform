import { expect, Locator, Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'
import { DateDivided } from './types'
import path from 'path'

export class CommonTrackerPage extends CalendarPage {
  readonly page: Page
  readonly buttonFilter: Locator
  readonly inputComment: Locator
  readonly buttonSendComment: Locator
  readonly textComment: Locator
  readonly textActivity: Locator
  readonly buttonSpaceSelectorMoveIssuesModal: Locator
  readonly buttonMoveIssuesModal: Locator
  readonly buttonKeepOriginalMoveIssuesModal: Locator
  readonly inputKeepOriginalMoveIssuesModal: Locator
  readonly buttonMoreActions: Locator
  readonly textActivityContent: Locator
  readonly linkInActivity: Locator
  readonly inputCommentFile: Locator
  readonly commentImg: Locator
  readonly inputFilterTitle: Locator
  readonly buttonFilterApply: Locator
  readonly buttonClearFilters: Locator
  readonly textCategoryHeader: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonFilter = page.locator('div.search-start > div:first-child button')
    this.inputComment = page.locator('div.text-input div.tiptap')
    this.buttonSendComment = page.locator('g#Send')
    this.textComment = page.locator('div.showMore-content p')
    this.textActivity = page.locator('div.header')
    this.buttonSpaceSelectorMoveIssuesModal = page.locator(
      'form[id="tracker:string:MoveIssues"] button[id="space.selector"]'
    )
    this.buttonMoveIssuesModal = page.locator('form[id="tracker:string:MoveIssues"] button[type="submit"]')
    this.buttonKeepOriginalMoveIssuesModal = page.locator('form[id="tracker:string:MoveIssues"] span.toggle-switch')
    this.inputKeepOriginalMoveIssuesModal = page.locator('form[id="tracker:string:MoveIssues"] input[type="checkbox"]')
    this.buttonMoreActions = page.locator('div.popupPanel-title div.flex-row-center > button:first-child')
    this.textActivityContent = page.locator('div.activityMessage div.content')
    this.linkInActivity = page.locator('div[id="activity:string:Activity"] a')
    this.inputCommentFile = page.locator('input#file')
    this.commentImg = page.locator('div.activityMessage div.content img')
    this.inputFilterTitle = page.locator('div.selectPopup input[placeholder="Title"]')
    this.buttonFilterApply = page.locator('div.selectPopup button[type="button"]', { hasText: 'Apply' })
    this.buttonClearFilters = page.locator('button > span', { hasText: 'Clear filters' })
    this.textCategoryHeader = page.locator('div.category-container > div.categoryHeader span[class*="label"]')
  }

  async selectFilter (filter: string, filterSecondLevel?: string): Promise<void> {
    await this.buttonFilter.click()
    await this.page.locator('div.selectPopup [class*="menu"]', { hasText: filter }).click()

    if (filterSecondLevel !== null && typeof filterSecondLevel === 'string') {
      switch (filter) {
        case 'Title':
          await this.inputFilterTitle.fill(filterSecondLevel)
          await this.buttonFilterApply.click()
          break
        case 'Labels':
          await this.selectFromDropdown(this.page, filterSecondLevel)
          break
        default:
          await this.page.locator('div.selectPopup [class*="menu"]', { hasText: filterSecondLevel }).click()
      }
    }
  }

  async checkFilter (filter: string, filterSecondLevel?: string, filterThirdLevel?: string): Promise<void> {
    await expect(this.page.locator('div.filter-section button:nth-child(1)')).toHaveText(filter)
    if (filterSecondLevel !== undefined) {
      await expect(this.page.locator('div.filter-section button:nth-child(2)')).toContainText(filterSecondLevel)
    }
    if (filterThirdLevel !== undefined) {
      await expect(this.page.locator('div.filter-section button:nth-child(3)')).toContainText(filterThirdLevel)
    }
  }

  async updateFilterDimension (
    filterSecondLevel: string,
    dateStart?: string,
    needToOpenCalendar: boolean = false
  ): Promise<void> {
    await this.page.locator('div.filter-section button:nth-child(2)').click()
    await this.page.locator('div.selectPopup [class*="menu"]', { hasText: filterSecondLevel }).click()

    if (dateStart !== undefined) {
      if (needToOpenCalendar) {
        await this.page.locator('div.filter-section button:nth-child(3)').click()
      }

      switch (dateStart) {
        case 'Today':
          await this.page.locator('div.popup div.calendar button.day.today').click()
          break
        default:
          await this.page.locator('div.popup div.calendar button.day').locator(`text="${dateStart}"`).click()
          break
      }
    }
  }

  async fillBetweenDate (dateStart: DateDivided, dateEnd: DateDivided): Promise<void> {
    // dateStart - day
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:first-child')
      .click({ delay: 100, position: { x: 1, y: 1 } })
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:first-child')
      .pressSequentially(dateStart.day)

    // dateStart - month
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:nth-child(3)')
      .click({ delay: 100, position: { x: 1, y: 1 } })
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:nth-child(3)')
      .pressSequentially(dateStart.month)

    // dateStart - year
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:nth-child(5)')
      .click({ delay: 100, position: { x: 1, y: 1 } })
    await this.page
      .locator('div.date-popup-container div.input:first-child span.digit:nth-child(5)')
      .pressSequentially(dateStart.year)

    // dateEnd - day
    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:first-child')
      .click({ delay: 100, position: { x: 1, y: 1 } })
    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:first-child')
      .pressSequentially(dateEnd.day)

    // dateEnd - month
    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:nth-child(3)')
      .click({ delay: 100, position: { x: 1, y: 1 } })
    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:nth-child(3)')
      .pressSequentially(dateEnd.month)

    // dateEnd - year
    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:nth-child(5)')
      .click({ delay: 100, position: { x: 1, y: 1 } })
    await this.page
      .locator('div.date-popup-container div.input:last-child span.digit:nth-child(5)')
      .pressSequentially(dateEnd.year)

    await this.page.locator('div.date-popup-container button[type="submit"]').click({ delay: 100 })
  }

  async addComment (comment: string): Promise<void> {
    await this.inputComment.fill(comment)
    await this.buttonSendComment.click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(this.textComment.filter({ hasText: comment }).first()).toBeVisible()
  }

  async checkActivityExist (activity: string): Promise<void> {
    await expect(this.textActivity.filter({ hasText: activity }).first()).toBeVisible()
  }

  async fillMoveIssuesModal (newProjectName: string, keepOriginalAttributes: boolean = false): Promise<void> {
    await this.buttonSpaceSelectorMoveIssuesModal.click()
    await this.selectMenuItem(this.page, newProjectName)

    if (keepOriginalAttributes) {
      await this.buttonKeepOriginalMoveIssuesModal.click()
    }

    await this.buttonMoveIssuesModal.click({ delay: 1000 })
  }

  async addMentions (mention: string): Promise<void> {
    await this.inputComment.fill(`@${mention}`)
    await this.selectMention(this.page, mention)
    await this.buttonSendComment.click()
  }

  async checkActivityContentExist (activityContent: string): Promise<void> {
    await expect(this.textActivityContent.filter({ hasText: activityContent })).toBeVisible()
  }

  async openLinkFromActivitiesByText (linkText: string): Promise<void> {
    await this.linkInActivity.filter({ hasText: linkText }).click()
  }

  async addCommentWithImage (comment: string, fileName: string): Promise<void> {
    await this.inputComment.fill(comment)
    await this.inputCommentFile.setInputFiles(path.join(__dirname, `../../files/${fileName}`))
    await expect(this.page.locator('div[slot="header"] div.item div.name', { hasText: fileName })).toBeVisible()
    await this.buttonSendComment.click()
  }

  async checkCommentWithImageExist (commentHeader: string, fileName: string): Promise<void> {
    await this.checkActivityExist(commentHeader)
    const srcset = await this.commentImg.getAttribute('srcset')
    expect(srcset).toContain(fileName)
  }

  async checkCategoryHeader (categoryHeader: string): Promise<void> {
    await expect(this.textCategoryHeader).toHaveText(categoryHeader)
  }

  async checkActionMissing (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.checkDropdownHasNo(this.page, action)
  }
}
