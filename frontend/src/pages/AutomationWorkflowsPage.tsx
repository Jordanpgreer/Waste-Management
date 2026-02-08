import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  automationWorkflowsApi,
  AutomationWorkflow,
  AutomationWorkflowStep,
  AutomationActionType,
} from '../api/automationWorkflows';
import { TicketType, TICKET_TYPE_LABELS, TICKET_STATUS_LABELS, TICKET_STATUS_OPTIONS } from '../types/ticket';

const ACTION_LIBRARY: Array<{
  actionType: AutomationActionType;
  title: string;
  subtitle: string;
}> = [
  { actionType: 'email_vendor', title: 'Email to Vendor', subtitle: 'Send vendor instructions automatically' },
  { actionType: 'email_client', title: 'Email to Client', subtitle: 'Send update or confirmation to client' },
  { actionType: 'update_status', title: 'Update Status', subtitle: 'Move ticket to next workflow status' },
  { actionType: 'internal_note', title: 'Internal Note', subtitle: 'Write an internal timeline note' },
  { actionType: 'wait', title: 'Wait Timer', subtitle: 'Delay next step for minutes' },
];

const TICKET_TYPE_OPTIONS: TicketType[] = Object.keys(TICKET_TYPE_LABELS) as TicketType[];

const NEW_WORKFLOW_BASE: Omit<AutomationWorkflow, 'id' | 'org_id' | 'created_at' | 'updated_at'> = {
  name: 'New Automation Workflow',
  description: '',
  ticket_type: 'missed_pickup',
  trigger_event: 'ticket_created',
  is_active: true,
  steps: [],
  created_by: null,
  updated_by: null,
};

const createStep = (actionType: AutomationActionType, index: number): AutomationWorkflowStep => {
  const stepId = `step_${Date.now()}_${index}`;
  if (actionType === 'email_vendor') {
    return {
      id: stepId,
      action_type: actionType,
      title: 'Email vendor',
      config: {
        recipient_type: 'vendor',
        subject_template: 'Request #{{request_number}} - {{ticket_subject}}',
        body_template:
          'Client: {{client_name}}\nAddress: {{client_address}}\n\nHi team,\nThis client has reported missed services for their {{waste_stream}} on {{missed_pickup_date}}.\n\nPlease advise for recovery services or a timestamp if services were completed.',
      },
    };
  }
  if (actionType === 'email_client') {
    return {
      id: stepId,
      action_type: actionType,
      title: 'Email client',
      config: {
        recipient_type: 'client',
        subject_template: 'Request #{{request_number}} update',
        body_template: 'Hi {{client_name}},\n\nHere is your latest update for Request #{{request_number}}.\n\n{{message_body}}',
      },
    };
  }
  if (actionType === 'update_status') {
    return {
      id: stepId,
      action_type: actionType,
      title: 'Update ticket status',
      config: {
        status: 'response_from_vendor',
      },
    };
  }
  if (actionType === 'internal_note') {
    return {
      id: stepId,
      action_type: actionType,
      title: 'Add internal note',
      config: {
        note_template: 'Automation note: {{ticket_subject}}',
      },
    };
  }
  return {
    id: stepId,
    action_type: actionType,
    title: 'Wait',
    config: {
      wait_minutes: 30,
    },
  };
};

export const AutomationWorkflowsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AutomationWorkflow | null>(null);
  const [draggedAction, setDraggedAction] = useState<AutomationActionType | null>(null);

  const isNewWorkflow = selectedWorkflowId === 'new';

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true);
        setError('');
        const items = await automationWorkflowsApi.list();
        setWorkflows(items);
        if (items.length > 0) {
          setSelectedWorkflowId(items[0].id);
          setDraft(items[0]);
        } else {
          setSelectedWorkflowId('new');
          setDraft({
            ...NEW_WORKFLOW_BASE,
            id: 'new',
            org_id: '',
            created_at: '',
            updated_at: '',
          });
        }
      } catch {
        setError('Failed to load automation workflows.');
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  const selectWorkflow = (workflow: AutomationWorkflow) => {
    setSelectedWorkflowId(workflow.id);
    setDraft(workflow);
    setError('');
    setNotice('');
  };

  const startNewWorkflow = () => {
    setSelectedWorkflowId('new');
    setDraft({
      ...NEW_WORKFLOW_BASE,
      id: 'new',
      org_id: '',
      created_at: '',
      updated_at: '',
    });
    setError('');
    setNotice('');
  };

  const updateDraft = (changes: Partial<AutomationWorkflow>) => {
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev));
  };

  const updateStep = (stepId: string, changes: Partial<AutomationWorkflowStep>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((step) => (step.id === stepId ? { ...step, ...changes } : step)),
      };
    });
  };

  const updateStepConfig = (stepId: string, changes: Record<string, any>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                config: {
                  ...step.config,
                  ...changes,
                },
              }
            : step
        ),
      };
    });
  };

  const removeStep = (stepId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.filter((step) => step.id !== stepId),
      };
    });
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    setDraft((prev) => {
      if (!prev) return prev;
      const idx = prev.steps.findIndex((step) => step.id === stepId);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.steps.length) return prev;
      const next = [...prev.steps];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { ...prev, steps: next };
    });
  };

  const addDraggedStep = () => {
    if (!draggedAction) return;
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: [...prev.steps, createStep(draggedAction, prev.steps.length)],
      };
    });
    setDraggedAction(null);
  };

  const saveWorkflow = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError('Workflow name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setNotice('');

      const payload = {
        name: draft.name.trim(),
        description: draft.description || '',
        ticket_type: draft.ticket_type,
        trigger_event: draft.trigger_event,
        is_active: draft.is_active,
        steps: draft.steps,
      };

      if (isNewWorkflow) {
        const created = await automationWorkflowsApi.create(payload);
        const next = [created, ...workflows];
        setWorkflows(next);
        setSelectedWorkflowId(created.id);
        setDraft(created);
      } else {
        const updated = await automationWorkflowsApi.update(draft.id, payload);
        const next = workflows.map((workflow) => (workflow.id === updated.id ? updated : workflow));
        setWorkflows(next);
        setDraft(updated);
      }

      setNotice('Workflow saved.');
    } catch {
      setError('Failed to save workflow.');
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async () => {
    if (!draft || isNewWorkflow) {
      startNewWorkflow();
      return;
    }
    if (!window.confirm('Delete this workflow?')) return;

    try {
      setSaving(true);
      await automationWorkflowsApi.remove(draft.id);
      const next = workflows.filter((workflow) => workflow.id !== draft.id);
      setWorkflows(next);
      if (next.length > 0) {
        selectWorkflow(next[0]);
      } else {
        startNewWorkflow();
      }
      setNotice('Workflow deleted.');
    } catch {
      setError('Failed to delete workflow.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Automation Workflows</h1>
          <p className="page-subtitle">Build ticket automations with drag-and-drop actions.</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-danger bg-danger-light/10 px-4 py-3 text-danger">{error}</div>}
        {notice && <div className="mb-4 rounded-lg border border-success bg-success-light/20 px-4 py-3 text-success-dark">{notice}</div>}

        {loading ? (
          <div className="card p-8 text-center text-secondary-600">Loading workflows...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px,1fr]">
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-600">Workflows</h2>
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={startNewWorkflow}>
                  + New
                </button>
              </div>
              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      selectedWorkflowId === workflow.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                    onClick={() => selectWorkflow(workflow)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-secondary-900">{workflow.name}</p>
                      <span
                        className={`badge ${
                          workflow.is_active
                            ? 'badge-success'
                            : 'bg-danger-light/20 text-danger-dark border border-danger/40'
                        }`}
                      >
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-600">{TICKET_TYPE_LABELS[workflow.ticket_type]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary-600">
                      Workflow Name
                    </label>
                    <input
                      className="input-field"
                      value={draft?.name || ''}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      placeholder="Missed Pickup - Vendor Outreach"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary-600">
                      Ticket Type
                    </label>
                    <select
                      className="input-field"
                      value={draft?.ticket_type || 'missed_pickup'}
                      onChange={(e) => updateDraft({ ticket_type: e.target.value as TicketType })}
                    >
                      {TICKET_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {TICKET_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary-600">
                      Description
                    </label>
                    <textarea
                      className="input-field min-h-[78px]"
                      value={draft?.description || ''}
                      onChange={(e) => updateDraft({ description: e.target.value })}
                      placeholder="Describe what this workflow automates."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
                <div className="card p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary-600">Action Library</h3>
                  <div className="space-y-2">
                    {ACTION_LIBRARY.map((action) => (
                      <div
                        key={action.actionType}
                        draggable
                        onDragStart={() => setDraggedAction(action.actionType)}
                        className="cursor-grab rounded-lg border border-secondary-200 bg-white px-3 py-2 transition hover:border-success hover:shadow-sm active:cursor-grabbing"
                      >
                        <p className="text-sm font-semibold text-secondary-900">{action.title}</p>
                        <p className="text-xs text-secondary-600">{action.subtitle}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-secondary-500">
                    Drag an action card and drop it into the workflow steps area.
                  </p>
                </div>

                <div
                  className="card p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addDraggedStep();
                  }}
                >
                  <div className="mb-3 rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-600">Workflow Steps</h3>
                  </div>
                  {draft?.steps.length ? (
                    <div className="space-y-3">
                      {draft.steps.map((step, idx) => (
                        <div key={step.id} className="rounded-lg border border-secondary-200 bg-white p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-secondary-500">Step {idx + 1}</p>
                              <input
                                className="mt-1 w-full rounded-md border border-secondary-200 px-2 py-1 text-sm font-semibold text-secondary-900"
                                value={step.title}
                                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                              />
                            </div>
                            <div className="ml-3 flex items-center gap-1">
                              <button className="btn-secondary px-2 py-1 text-xs" onClick={() => moveStep(step.id, 'up')}>
                                Up
                              </button>
                              <button className="btn-secondary px-2 py-1 text-xs" onClick={() => moveStep(step.id, 'down')}>
                                Down
                              </button>
                              <button className="btn-danger px-2 py-1 text-xs" onClick={() => removeStep(step.id)}>
                                Remove
                              </button>
                            </div>
                          </div>

                          {(step.action_type === 'email_vendor' || step.action_type === 'email_client') && (
                            <div className="grid grid-cols-1 gap-3">
                              <input
                                className="input-field"
                                placeholder="Subject template"
                                value={step.config.subject_template || ''}
                                onChange={(e) => updateStepConfig(step.id, { subject_template: e.target.value })}
                              />
                              <textarea
                                className="input-field min-h-[130px]"
                                placeholder="Email body template"
                                value={step.config.body_template || ''}
                                onChange={(e) => updateStepConfig(step.id, { body_template: e.target.value })}
                              />
                            </div>
                          )}

                          {step.action_type === 'update_status' && (
                            <select
                              className="input-field"
                              value={step.config.status || 'response_from_vendor'}
                              onChange={(e) => updateStepConfig(step.id, { status: e.target.value })}
                            >
                              {TICKET_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {TICKET_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          )}

                          {step.action_type === 'internal_note' && (
                            <textarea
                              className="input-field min-h-[100px]"
                              placeholder="Internal note template"
                              value={step.config.note_template || ''}
                              onChange={(e) => updateStepConfig(step.id, { note_template: e.target.value })}
                            />
                          )}

                          {step.action_type === 'wait' && (
                            <input
                              type="number"
                              className="input-field"
                              min={1}
                              value={step.config.wait_minutes || 30}
                              onChange={(e) => updateStepConfig(step.id, { wait_minutes: Number(e.target.value || 0) })}
                            />
                          )}

                          <p className="mt-2 text-xs text-secondary-500">
                            Action type: <span className="font-semibold">{step.action_type}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-8 text-center text-secondary-600">
                      Drop actions here to start building the automation flow.
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-600">Template Variables</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    '{{request_number}}',
                    '{{ticket_subject}}',
                    '{{client_name}}',
                    '{{client_address}}',
                    '{{waste_stream}}',
                    '{{missed_pickup_date}}',
                    '{{message_body}}',
                  ].map((token) => (
                    <span key={token} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <label className="mr-auto inline-flex items-center gap-2 rounded-lg border border-secondary-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    checked={draft?.is_active || false}
                    onChange={(e) => updateDraft({ is_active: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-secondary-700">Workflow active</span>
                </label>
                <button className="btn-danger-outline" onClick={deleteWorkflow} disabled={saving}>
                  {isNewWorkflow ? 'Clear Draft' : 'Delete Workflow'}
                </button>
                <button className="btn-primary" onClick={saveWorkflow} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Workflow'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
