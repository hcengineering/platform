import WorkSpace from "../pages/WorkSpace";

describe("WorkSpace Page", function(){
   let data,errorBox,errorMsg,loginverify
    
   before(function(){
      cy.fixture("WorkSpace").then(function(userdata){
         data=userdata
      })
    });
    
    beforeEach(function(){
       cy.visit('/login', { failOnStatusCode: false });
       WorkSpace.enterUserName(data.email)
       WorkSpace.enterPassword(data.password)
       WorkSpace.clickLoginBtn()
       WorkSpace.loginVerify(loginverify,data.verifylogin)

    });

    it("Verfying Button are Clickable",function(){
       WorkSpace.VerifyLinks()
   });

})