import urls from '../POM/urls';
import {login} from '../POM/functions';
import fixtureData from '../fixtures/test_data.json'

describe('Verify Login feature', () => {
    beforeEach("Visiting Login page", ()=>{
        cy.visit(urls.loginPageUrl);
      })
    
    it('TC_01: Verify that the user is able to login with valid credentials',()=>{
        login(fixtureData.Email, fixtureData.Password)
        // cy.get('.ico-account').should('have.text','My account')
        // cy.get('.ico-logout').should('have.text','Log out')
        //asasds
    })
  })