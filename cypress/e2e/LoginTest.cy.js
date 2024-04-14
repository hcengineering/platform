import LoginPage from "../Pages/LoginPage";

describe("Login Page", function(){
   let data,errorBox,errorMsg,loginverify
    
   before(function(){
      cy.fixture("LoginPage").then(function(userdata){
         data=userdata
      })
    });
    
    beforeEach(function(){
      //  cy.visit('/login');
       cy.visit('/login', { failOnStatusCode: false });

    });

    it("Verifying With Valid Credentials",function(){

       LoginPage.enterUserName(data.email)
       LoginPage.enterPassword(data.password)
       LoginPage.clickLoginBtn()
       LoginPage.loginVerify(data.verifylogin)
       
   });
    it("Verifying with Valid Username and Invalid Password",function(){

      LoginPage.enterUserName(data.email)
      LoginPage.enterPassword(data.ivpassword)
      LoginPage.clickLoginBtn()
      LoginPage.MsgError1(data.errorMsg)
   });
    it("Verifying with Invalid Username and Valid Password",function(){
      
      LoginPage.enterUserName(data.ivusername)
      LoginPage.enterPassword(data.password)
      LoginPage.clickLoginBtn()
      LoginPage.MsgError(data.errorMsg)
   });
   it("Verifying with non-registered Credential",function(){

      LoginPage.enterUserName(data.invaliduser)
      LoginPage.enterPassword(data.invalidpassword)
      LoginPage.clickLoginBtn()
      LoginPage.MsgError(data.errorMsg)
         
   });
   it("Verifying with Empty Credentials",function(){
      LoginPage.clickLoginBtn()
      LoginPage.signupVerify(data.verifySignup)
   })

});