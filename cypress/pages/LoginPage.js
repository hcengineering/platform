class LoginPage
{
    elements = {
        
        email: () => cy.xpath("//input[@name='email']"),
    
        password: () => cy.xpath("//input[@name='current-password']"),

        loginBtn: () => cy.xpath("//div[@class='form-row send svelte-vbdvna']//button[@type='button']"),

        verifyLogin: () => cy.xpath("(//div[@class='title svelte-ex1r56'])[1]"),
        
        errorMsg: () => cy.xpath("//span[@class='text-sm ml-2']/text()"),
        
        verifySignup: () => cy.xpath("//h4[contains(text(),'A message has been sent to your email containing a link to confirm your address.')]"),
       
        
    };

    signupVerify(){
      this.elements.verifySignup().should('have.text', 'A message has been sent to your email containing a link to confirm your address.')
  }

    loginVerify(){
      this.elements.verifyLogin().should('have.text', 'Select workspace')
    }

    enterUserName(email) {
        this.elements.email().clear().type(email)
    }

    enterPassword(password) {
        this.elements.password().clear().type(password)
    }

    clickLoginBtn() {
        this.elements.loginBtn().click()
    }

    MsgError() {
        this.elements.errorMsg().should('have.text', 'Account not found')
    }

    MsgError1() {
      this.elements.errorMsg().should('have.text', 'Invalid password')
  }
}
export default new LoginPage();