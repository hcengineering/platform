const selectors = {
    //hanle login page
    userEmail: '[name="DateOfBirthYear"]',
    userPassword: '[name="current-password"]',
    logInButton: '[type = "button"]',
    selectWorkSpace: '.label',

    //handle registeration page
    firstName: '[name="given-name"]',
    lastName: '[name="family-name"]',
    userEmail: '[name= "email"]',
    newUserPasssword: '[name="new-password"]',
    confirmNewUserPassword: '[name="new-password"]',
    signUpButton: '[type="button"]',
    nameWorkSpace: '[name="workspace"]',
    createWorkSpaceButton: '[type="button"]',

    //handle tracker page locators
    clickTrackerIcon: '[class="flex-center icon-container svelte-dstakk"]',
    showMenu: '[id="app-workbench:string:ShowMenu"]',
    newIssueButton: '[id="new-issue"]',
    addIssueTitle: '[placeholder="Issue title"]',
    addIssueDescription: '[data-placeholder="Add description…"]',
    createIssue: '[type="submit"]',
    setPriority: '[placeholder="Set priority…"]',
    choosePriority: ''


}
export default selectors;