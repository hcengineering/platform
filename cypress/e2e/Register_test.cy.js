import urls from '../POM/urls';
import {faker} from '@faker-js/faker'
import { register } from '../POM/functions';

 
const firstName = faker.person.firstName()
const lastName = faker.person.lastName()
const email = faker.internet.email()
const password = faker.internet.password()

describe('Verify Registeration feature', () => {
  beforeEach("Visiting Register page", ()=>{
    cy.visit(urls.registerPageUrl)
  })
  
  it("TC:02: Verify that the user can Register to website successfully" ,()=>{
    register(firstName, lastName, email, password, password, firstName)
    // cy.get('.result').should('have.text', 'Your registration completed')
  })

})