export enum TrackerEvents {
  IssuePlusButtonClicked = 'tracker.issue.PlusButtonClicked',
  NewIssueButtonClicked = 'tracker.issue.NewIssueButtonClicked',
  IssueCreateFromGlobalActionCalled = 'tracker.issue.CreateFromGlobalActionCalled',
  NewIssueBindingCalled = 'tracker.issue.NewIssueBindingCalled',

  IssueCreated = 'tracker.issue.Created',
  IssueDeleted = 'tracker.issue.Deleted',

  IssueSetStatus = 'tracker.issue.SetStatus',
  IssueSetPriority = 'tracker.issue.SetPriority',
  IssueSetAssignee = 'tracker.issue.SetAssignee',
  IssueSetDueDate = 'tracker.issue.SetDueDate',
  IssueSetEstimate = 'tracker.issue.SetEstimate',
  IssueTimeSpentAdded = 'tracker.issue.TimeSpentAdded',
  IssueTimeSpentUpdated = 'tracker.issue.TimeSpentUpdated',
  IssueTitleUpdated = 'tracker.issue.TitleUpdated',
  IssueDescriptionUpdated = 'tracker.issue.DescriptionUpdated',

  IssueComponentAdded = 'tracker.issue.ComponentAdded',
  IssueMilestoneAdded = 'tracker.issue.MilestoneAdded',

  ProjectCreated = 'tracker.project.Created',
  ProjectDeleted = 'tracker.project.Deleted',
  ProjectArchived = 'tracker.project.Archived',

  IssueParentUnset = 'tracker.issue.ParentUnset'
}
