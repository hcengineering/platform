class WorkSpace
{
    elements = {
        
        email: () => cy.xpath("//input[@name='email']"),
    
        password: () => cy.xpath("//input[@name='current-password']"),

        loginBtn: () => cy.xpath("//div[@class='form-row send svelte-vbdvna']//button[@type='button']"),

        verifyLogin: () => cy.xpath("(//div[@class='title svelte-ex1r56'])[1]"),
        
        errorMsg: () => cy.xpath("//span[@class='text-sm ml-2']/text()"),

        workSpaceVerify: (msg1) => cy.xpath("//div[@class='fs-title' and text()='user1']"),

        workSpace1: () => cy.xpath("//span[normalize-space()='test-ws-1']"),

        workSpace2: () => cy.xpath("//span[normalize-space()='test2']"),

        createWorkspace: () => cy.xpath("//a[normalize-space()='Create workspace']"),

        changeAccount: () => cy.xpath("//a[normalize-space()='Change account']"),
 
    };

    VerifyLinks(){
        this.elements.workSpace1().should('exist').and('not.be.disabled')

        this.elements.workSpace2().should('exist').and('not.be.disabled')

        this.elements.createWorkspace().should('exist').and('not.be.disabled')

        this.elements.changeAccount().should('exist').and('not.be.disabled')

    }

    enterUserName(email) {
        this.elements.email().clear().type(email)
    }

    enterPassword(password) {
        this.elements.password().clear().type(password, {log: false })
    }

    clickLoginBtn() {
        this.elements.loginBtn().click()
    }

    loginVerify(){
        this.elements.verifyLogin().should('have.text', 'Select workspace')
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
module.exports = new WorkSpace();