---
persons:
  - name: John Doe
    email: john@huly.io
    role: Owner
  - name: Joe Shmoe
    email: joe@huly.io
    role: User
projectTypes:
  - name: Custom
    taskTypes:
      - name: Task
        description: A task represents a specific action that needs to be completed. Tasks can be associated with issues and projects.
        statuses:
        - name: Todo
          description: The task is currently in the “Todo” status and has not yet been started.
        - name: In Progress
          description: The task is currently in the “In Progress” status and is being worked on.
        - name: Done
          description: The task is currently in the “Done” status and has been completed.
      - name: Bug
        description: Bug needs to be fixed.
        statuses:
        - name: Todo
          description: The bug is currently in the “Todo” status and has not yet been started.
        - name: In Progress
          description: The bug is currently in the “In Progress” status and is being worked on.
        - name: Fixed
          description: The bug is currently in the “Fixed” status and has been completed.
---
