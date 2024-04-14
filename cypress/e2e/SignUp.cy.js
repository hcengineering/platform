import { it } from "mocha";
import SignUp from "../pages/SignUp";
import { faker } from '@faker-js/faker';
// import faker from 'faker';

describe("SignUp Page", function(){
   let data,errorBox,errorMsg,loginverify
    
   before(function(){
      cy.fixture("SignUp").then(function(userdata){
         data=userdata
      })
    });
    
    beforeEach(function(){
       cy.visit('/signup', { failOnStatusCode: false });
    });

    it("Verifying With Existing account",function(){

       SignUp.clickSignUp()
       SignUp.enterFirstName(data.firstname)
       SignUp.enterLastName(data.lastname)
       SignUp.enterEmail(data.email)
       SignUp.enterPassword(data.password)
       SignUp.enterRepeatPassword(data.password)
       SignUp.clickSignUpBtn()
       SignUp.MsgError(data.errorMsg)
       
    });

    it("Verifying With Invalid Email",function(){

        SignUp.clickSignUp()
        SignUp.enterFirstName(data.firstname)
        SignUp.enterLastName(data.lastname)
        SignUp.enterEmail(data.numbers)
        SignUp.enterPassword(data.password)
        SignUp.enterRepeatPassword(data.password)
        SignUp.clickSignUpBtn()
      
    });

    it("Verifying with Empty Credentials",function(){
        SignUp.clickSignUp()
        SignUp.clickSignUpBtn1()
        
     })

     it("Verifying with Empty Email Field",function(){
       SignUp.clickSignUp()
       SignUp.enterFirstName(data.firstname)
       SignUp.enterLastName(data.lastname)
       SignUp.enterPassword(data.password)
       SignUp.enterRepeatPassword(data.password)
       SignUp.clickSignUpBtn1()
     })

     it("Verifying with Empty First Name",function(){
       SignUp.clickSignUp()
       SignUp.enterLastName(data.lastname)
       SignUp.enterEmail(data.email)
       SignUp.enterPassword(data.password)
       SignUp.enterRepeatPassword(data.password)
       SignUp.clickSignUpBtn1()
     })

     it("Verifying with Empty Last Name",function(){
       SignUp.clickSignUp()
       SignUp.enterFirstName(data.firstname)
       SignUp.enterEmail(data.email)
       SignUp.enterPassword(data.password)
       SignUp.enterRepeatPassword(data.password)
       SignUp.clickSignUpBtn1()
     })

     it("Verifying with Empty Password",function(){
       SignUp.clickSignUp()
       SignUp.enterFirstName(data.firstname)
       SignUp.enterLastName(data.lastname)
       SignUp.enterEmail(data.email)
       SignUp.clickSignUpBtn1()
     })
})
