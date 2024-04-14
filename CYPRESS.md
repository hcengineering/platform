## Huly Platform Automation

For this test, I had very little information to create a real task description and acceptance criteria, so I had to assume some information to create the test cases that I considered good for the development step.

The feature chosen was the Tracker one, and this decision was based on the assessment that this functionality would probably be one of the most used aspects.


#### **Test Plan:**

**Unit Tests:**

>     Unit tests should be developed by the dev before moving the task to QA tests

**Manual test**

>     Do manual tests considering the test cases for this feature

**Test Case:**

* Create a new issue.

>       User is able to create a new issue with title, description and choosing date, labels, status, etc.
>
>       User should be able to delete a created issue in the Tracker section.

*     Create a new issue
*     Write a description of the issue
*     Select the Status, Priority, Labels, Date, Time, and etc.
*     Confirm the new issue created.
*     Choose a issue and select delete.
 

**Automation Tests**

>     For this feature 4 scenarios were created

* Login with a valid username and password
* Login with an invalid username and password
* Create a new issue on Tracker page
* Delete a created issue 

### The automation Project:

The automation was created using Cypress.

The automation is running everything in local environment as default.

To Run the automation you need to install Cypress:

```plaintext
npm install cypress
```

After that you can open using:

```plaintext
npx cypress open
```

Once Cypress is open, you can choose between 'login' and 'tracker' to run the automation

This way the automation will run headless and will run using Chromium, Safari and Firefox.