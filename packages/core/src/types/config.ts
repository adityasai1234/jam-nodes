/**
 * Approval configuration for nodes.
 * Any node can optionally require approval before/after execution.
 */
export interface NodeApprovalConfig {
  /** Whether approval is required for this node */
  required: boolean;
  /** Whether to pause workflow execution until approved (default: true) */
  pauseWorkflow?: boolean;
  /** Timeout in minutes before auto-rejection (default: 1440 = 24h) */
  timeoutMinutes?: number;
  /** Type of approval for UI display */
  approvalType?: string;
  /** Optional message to display to approver */
  message?: string;
}

/**
 * Notification configuration for nodes.
 * Any node can optionally send notifications on completion/error.
 */
export interface NodeNotificationConfig {
  /** Enable notifications for this node */
  enabled: boolean;
  /** Channels to send notifications to */
  channels?: Array<'chat' | 'email' | 'slack' | 'webhook'>;
  /** Notification message template */
  message?: string;
  /** Priority level */
  priority?: 'low' | 'medium' | 'high';
  /** Notify on successful completion */
  notifyOnComplete?: boolean;
  /** Notify on error */
  notifyOnError?: boolean;
}

/**
 * Base config that all nodes can optionally include.
 * Provides approval and notification capabilities to any node type.
 */
export interface BaseNodeConfig {
  /** Approval configuration */
  approval?: NodeApprovalConfig;
  /** Notification configuration */
  notification?: NodeNotificationConfig;
}
