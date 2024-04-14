import userData from '../fixtures/user-data.json'
import LoginPage from '../pages/login-page'
import TrackerPage from '../pages/tracker-page'


const loginPage = new LoginPage()
const trackerPage = new TrackerPage()

beforeEach(() => {
  loginPage.accessLoginPage()
  loginPage.loginWithSpecificUser(userData.userSuccess.username, userData.userSuccess.password)
})

describe('Tracker Feature', () => {
  
  it('Tracker - New Issue', () => {
    trackerPage.createNewIssue()
    trackerPage.deleteIssue()
  
  })


}
)