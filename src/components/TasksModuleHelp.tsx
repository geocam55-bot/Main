import { CheckSquare, Filter, Plus, Search, X } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface TasksModuleHelpProps {
  userId: string;
  totalTasks: number;
  completedTasks: number;
  onSearchExample: (query: string) => void;
  onShowPending: () => void;
  onShowCompleted: () => void;
  onClearSearch: () => void;
  onOpenAddTask: () => void;
}

export function TasksModuleHelp({
  userId,
  totalTasks,
  completedTasks,
  onSearchExample,
  onShowPending,
  onShowCompleted,
  onClearSearch,
  onOpenAddTask,
}: TasksModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="tasks-help"
      userId={userId}
      title="Tasks Module Interactive Help"
      description="Plan, prioritize, and complete work faster using quick actions from this guide."
      moduleIcon={CheckSquare}
      triggerLabel="Tasks Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Use search to identify the right tasks and lock in what should be worked next.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Prioritize accurately using status, priority, and due dates so team commitments stay realistic.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Mark completion clearly and hand off finished work with visible status and timeline context.',
        },
      ]}
      badges={[
        { label: 'Total Tasks', value: totalTasks },
        { label: 'Completed', value: completedTasks, variant: 'outline' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        {
          label: 'Open Search Example',
          icon: Search,
          variant: 'outline',
          onClick: () => onSearchExample('high priority pending'),
        },
        {
          label: 'Show Pending Tasks',
          icon: Filter,
          variant: 'outline',
          onClick: onShowPending,
        },
        {
          label: 'Show Completed Tasks',
          icon: Filter,
          variant: 'outline',
          onClick: onShowCompleted,
        },
        {
          label: 'Clear Search',
          icon: X,
          variant: 'outline',
          onClick: onClearSearch,
          fullWidth: true,
        },
        {
          label: 'Open Add Task Form',
          icon: Plus,
          onClick: onOpenAddTask,
          fullWidth: true,
        },
      ]}
      howToGuides={[
        {
          title: 'How to create a new task',
          steps: [
            'Discovery: Open Tasks and click Add Task.',
            'Scope Lock: Enter clear task title and description.',
            'Estimate: Set priority and due date based on urgency/timeline.',
            'Approval: Save the task to publish it to the list.',
            'Handoff: Search/verify task visibility for assignees and stakeholders.',
          ],
        },
        {
          title: 'How to complete a task',
          steps: [
            'Discovery: Locate the task using search or list filters.',
            'Scope Lock: Confirm the correct task row before status change.',
            'Approval: Click the circle/check icon to mark completed.',
            'Handoff: Use Completed view to confirm finished work is visible.',
            'Estimate/Rework: Reopen to pending if additional work is required.',
          ],
        },
      ]}
    />
  );
}