import userData from '../fixtures/user-data.json'
import LoginPage from '../pages/login-page'


const loginPage = new LoginPage()


describe('Login Huly Plataform', () => {
  it('Login Success', () => {
    loginPage.accessLoginPage()
    loginPage.loginWithSpecificUser(userData.userSuccess.username, userData.userSuccess.password)
  })

  it('Login Failure', () => {
    loginPage.accessLoginPage()
    loginPage.loginWithWrongUser(userData.userFailure.username, userData.userFailure.password)
    loginPage.checkAcessInvalid()
  })

}
)