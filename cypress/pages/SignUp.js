class SignUpPage
{
    elements = {
        
        firstname: () => cy.xpath("//input[@name='given-name']"),

        lastname: () => cy.xpath("//input[@name='family-name']"),
        
        email: () => cy.xpath("//input[@name='email']"),
    
        password: () => cy.xpath("//div[4]//div[1]//input[1]"),

        repeatPassword: () => cy.xpath("//div[5]//div[1]//input[1]"),

        signupBtn: () => cy.xpath("//div[@class='form-row send svelte-vbdvna']//button[@type='button']"),

        signUp: () => cy.xpath("//a[normalize-space()='Sign Up']"),

        errorMsg: () => cy.xpath("//span[@class='text-sm ml-2']/text()"),

        verifySignup: () => cy.xpath("//h4[contains(text(),'A message has been sent to your email containing a')]"),
        
    };

    MsgError() {
        this.elements.errorMsg().should('have.text', 'Account already exists')
    }

    enterFirstName(firstname) {
        this.elements.firstname().clear().type(firstname)
    }

    enterLastName(lastname) {
        this.elements.lastname().clear().type(lastname)
    }

    enterEmail(email) {
        this.elements.email().clear().type(email)
    }

    enterPassword(password) {
        this.elements.password().clear().type(password)
    }

    enterRepeatPassword(repeatPassword) {
        this.elements.repeatPassword().clear().type(repeatPassword)
    }

    clickSignUpBtn() {
        this.elements.signupBtn().click()
    }

    clickSignUp() {
        this.elements.signUp().click()
    }

    clickSignUpBtn1(){
        this.elements.signupBtn().should('exist').and('be.disabled')
    }

    
    signupVerify(){
        this.elements.verifySignup().should('have.text', 'A message has been sent to your email containing a')
    }

    // verifyMessage(types,msg) {
    //     switch (types) {
    //     //   case "errorMsg":
    //     //     this.elements.errorMsg().should("exist").and("have.text",msg)
    //     //     break;
    //       case "signupverify":
    //         this.elements.verifySignup().should("have.text",msg)
    //         break;
    //     }
    //   }

}
export default new SignUpPage();