class TrackerPage {
    constructor() {
        this.trackerSelection = ".selected .svg-medium",
        this.newIssueButton = "button#new-issue",
        this.textBoxIssue = "[style='width: 100%;'][type='text']",
        this.backlogButton = "#status-editor",
        this.priorityButton = "#priority-editor",
        this.assigneeButton = "#assignee-editor",
        this.labelsButton = ".antiCard-pool > :nth-child(4)",
        this.componentButton = ".antiCard-pool > :nth-child(5)",
        this.estimationButton = "#estimation-editor",
        this.milestoneButton = "#milestone-editor",
        this.dateButton = "#duedate-editor",
        this.parentIssueButton = "#parentissue-editor",
        this.createIssueButton = ".bs-solid[type='submit']",
        this.backlogListOption = ".selection .menu-item",
        this.menuBarButton = ".medium .svg-medium",
        this.statusList = ".menu-item",
        this.assigneeList = ".text-left",
        this.addButtonLabels = ".header > .antiButton",
        this.createButton = "[style='z-index: 1501; top: 15vh; left: calc(50% - 360px); max-height: 75vh;'] [type='submit']",
        this.labelsList = ".menu-item",
        this.datePicker = ".flex-row-center [tabindex='0']",
        this.textBoxLabels = "[placeholder='Please type  title']",
        this.saveButton = ".svelte-1i762fn [type='submit']",
        this.descriptionBox = "[data-placeholder='Add description…']",
        this.issueCreationAlert = ".root.svelte-chf5o9",
        this.viewButton = ".reverse [style='flex-shrink: 0; padding: 0px 0.75rem;']",
        this.viewSwitch = ".toggle-switch",
        this.blankSpace = ".shown",
        this.popUp = ".antiList__row[draggable='true']",
        this.popUpList = ".antiPopup-submenu",
        this.selectButton = "[style='z-index: 10; --header-bg-color: #d1dfee;'] [style='flex-shrink: 0; padding: 0px 0.75rem;'][type='button']",
        this.deleteButton = ":nth-child(14) > .overflow-label",
        this.deleteConfirmButton = "button[type='submit']"
    

    }
    
    

    createNewIssue() {
        cy.get(this.trackerSelection).click();
        cy.get(this.menuBarButton).click();
        cy.get(this.newIssueButton).click();
        cy.get(this.textBoxIssue).type('new issue Test');
        cy.get(this.descriptionBox).type('description text Test')
        cy.get(this.backlogButton).click();
        cy.get(this.statusList).eq(2).click();
        cy.get(this.priorityButton).click();
        cy.get(this.statusList).eq(4).click();
        cy.get(this.assigneeButton).click();
        cy.get(this.assigneeList).click();
        cy.get(this.labelsButton).click();
        cy.get(this.addButtonLabels).click();
        cy.get(this.textBoxLabels).type('Test');
        cy.get(this.createButton).click();
        cy.get(this.labelsList).last().click();
        cy.get(this.labelsList).last().type('{esc}');
        cy.get(this.dateButton).click();
        cy.get(this.datePicker).first().type('05052024', {force: true});
        cy.get(this.saveButton).click();
        cy.get(this.createIssueButton).click();
        cy.get(this.issueCreationAlert).should('be.visible')
    }

    deleteIssue() {
        cy.get(this.blankSpace).click();
        cy.get(this.viewButton).click();
        cy.get(this.viewSwitch).eq(1).click();
        cy.get(this.viewSwitch).eq(1).type('{esc}');;
        cy.get(this.selectButton).eq(1).click({force: true});
        cy.get(this.popUp).eq(0).rightclick();
        cy.get(this.deleteButton).click();
        cy.get(this.deleteConfirmButton).click();
    }
  
  
  }
  
  export default TrackerPage