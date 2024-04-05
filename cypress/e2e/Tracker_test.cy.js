import urls from '../POM/urls';
import {faker} from '@faker-js/faker'
import { createIssue, login } from '../POM/functions';
import fixtureData from '../fixtures/test_data.json'

const title = faker.person.jobTitle();
const description = faker.person.jobTitle();

describe('Verify Tracker Feature', () => {
  beforeEach("Visiting Register page", ()=>{
    cy.visit(urls.loginPageUrl)
    login(fixtureData.Email, fixtureData.Password)
})
  
  it("TC:03: Verify that the user can create issue just by adding Title and description" ,()=>{

    createIssue(title, description)

    // cy.get('.result').should('have.text', 'Your registration completed')
  })

})