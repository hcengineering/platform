class LoginPage {
    constructor() {
        this.usernameField = "[type='text']",
        this.passwordField = "[type='password']",
        this.logInButton = ".form-row [type='button']",
        this.workspaceSelection = ".workspace",
        this.loginFailAlert = ".ERROR"
        
    }

    accessLoginPage() {
        cy.visit('http://localhost:8087')
    }
  
    loginWithSpecificUser(username, password) {
        cy.get(this.usernameField).type(username);
        cy.get(this.passwordField).type(password);
        cy.get(this.logInButton).click();
        cy.get(this.workspaceSelection).click();
    }

    loginWithWrongUser(username, password) {
        cy.get(this.usernameField).type(username);
        cy.get(this.passwordField).type(password);
        cy.get(this.logInButton).click();
    }

    checkAcessInvalid() {
        cy.get(this.loginFailAlert).should('be.visible');
    }
  
    // checkAcessInvalid() {
    //     cy.get(this.wrongCredentialAlert).should('be.visible');
    // }
  
    // signUpUser(firstName, lastName, username, password, confirmPassword) {
    //     cy.get(this.signUpUser).click();
    //     cy.get(this.firstNameSignUpField).type(firstName);
    //     cy.get(this.lastNameSignUpField).type(lastName);
    //     cy.get(this.usernameSignUpField).type(username);
    //     cy.get(this.passwordSignUpField).type(password);
    //     cy.get(this.confirmPasswordSignUpField).type(confirmPassword);
    //     cy.get(this.signUpButtom).click();
    //     cy.get(this.signInSign).should('be.visible');
    // }
  
  }
  
  export default LoginPage