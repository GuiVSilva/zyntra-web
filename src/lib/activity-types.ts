export const ActivityType = {
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_ARCHIVED: 'organization.archived',
  SESSION_CREATED: 'session.created',
  ACCOUNT_LINKED: 'account.linked',

  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_ARCHIVED: 'project.archived',
  PROJECT_UNARCHIVED: 'project.unarchived',
  PROJECT_DELETED: 'project.deleted',

  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_MOVED: 'task.moved',
  TASK_ARCHIVED: 'task.archived',
  TASK_DELETED: 'task.deleted',

  WORKFLOW_STATUS_CREATED: 'workflow_status.created',
  WORKFLOW_STATUS_UPDATED: 'workflow_status.updated',
  WORKFLOW_STATUS_REORDERED: 'workflow_status.reordered',
  WORKFLOW_STATUS_DELETED: 'workflow_status.deleted',

  LABEL_CREATED: 'label.created',
  LABEL_UPDATED: 'label.updated',
  LABEL_DELETED: 'label.deleted',

  COMMENT_CREATED: 'comment.created',
  COMMENT_UPDATED: 'comment.updated',
  COMMENT_DELETED: 'comment.deleted',

  // Recorded at finalize, not at presign: an upload that was agreed to and never
  // completed is not a thing that happened to the project.
  ATTACHMENT_ADDED: 'attachment.added',
  ATTACHMENT_REMOVED: 'attachment.removed'
} as const
