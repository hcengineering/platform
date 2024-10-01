import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../../utils'
import { ReviewsPage } from '../../model/recruiting/reviews-page'
import { NewReview } from '../../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Recruiting. Review tests', () => {
  let reviewsPage: ReviewsPage

  const newReview: NewReview = {
    title: 'Dynamic Review Name',
    participants: ['Appleseed John', 'Chen Rosamund'],
    talent: { firstName: 'Andrey', lastName: 'P.' },
    location: 'Monte Carlo',
    description: 'Description of Review'
  }

  test.beforeEach(async ({ page }) => {
    reviewsPage = new ReviewsPage(page)
    newReview.title = `Review ${generateId()}`

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('Create a Review', async ({ page }) => {
    await reviewsPage.createReview(newReview)
    await reviewsPage.openAndCheckReview(newReview)
  })

  test('Edit a Review', async ({ page }) => {
    const reviewTitle = await reviewsPage.createReview(newReview)

    const updateReviewData: NewReview = {
      title: 'Updated ' + reviewTitle,
      description: 'Updated Review',
      talent: { firstName: 'Andrey', lastName: 'P.' },
      location: 'New York',
      verdict: 'He is a good candidate'
    }
    await reviewsPage.openAndUpdateReview(newReview, updateReviewData)
    await reviewsPage.openReviews()

    await reviewsPage.openAndCheckReview(updateReviewData)
  })

  test('Delete a Review', async ({ page }) => {
    const reviewTitle = await reviewsPage.createReview(newReview)
    await reviewsPage.openReviews()
    await reviewsPage.checkReviewExist(reviewTitle)
    await reviewsPage.deleteReview(reviewTitle)
    await reviewsPage.checkReviewNotExist(reviewTitle)
  })
})
