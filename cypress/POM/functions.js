import selectors from './selectors';


//Login Functions
const login = (email, password) => {
    cy.get(selectors.userEmail).type(email)
    cy.get(selectors.userPassword).type(password)
    cy.get(selectors.logInButton).contains('Log In').click({force:true}).wait(500)
    cy.get(selectors.selectWorkSpace).click().wait(500)
  };



   export { login }

//Registeration Form Functions
const register = (fname, lname, email, password, confirmPassword, nameOfWorkSpace) => {
    cy.get(selectors.firstName).type(fname)
    cy.get(selectors.lastName).type(lname)
    cy.get(selectors.userEmail).type(email)
    cy.get(selectors.newUserPasssword).eq(0).type(password)
    cy.get(selectors.confirmNewUserPassword).eq(1).type(confirmPassword)
    cy.get(selectors.signUpButton).contains('Sign Up').click({force:true})
    cy.get(selectors.nameWorkSpace).type(nameOfWorkSpace)
    cy.get(selectors.createWorkSpaceButton).contains('Create workspace').click({force:true})
};

   export { register }

//Tracker form structure
const createIssue = (issueTitle, issueDescription) => {
    cy.get(selectors.clickTrackerIcon).eq(6).click()

    cy.get(selectors.showMenu).then(($element) => {
        // Check if the ID is "ShowMenu"
        if ($element.attr('id') === 'app-workbench:string:ShowMenu') {
          // Click on the element if its ID is "ShowMenu"
          cy.wrap($element).click()
        } else {
          // Log a message if the ID is not "ShowMenu"
        //   cy.log($element.attr('id'))
          cy.log('Element ID is not "ShowMenu", skipping click')
          cy.wrap($element).click()
        }

    cy.get(selectors.newIssueButton).click()
    cy.get(selectors.addIssueTitle).type(issueTitle)
    cy.get(selectors.addIssueDescription).type(issueDescription)
    cy.get(selectors.createIssue).contains('Create issue').click({force:true})
})
}
   export { createIssue }