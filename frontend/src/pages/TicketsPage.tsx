import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ticketsApi, CreateTicketInput, TicketFilters, TicketMessage, UpdateTicketInput, TicketAttachment } from '../api/tickets';
import { clientsApi } from '../api/clients';
import { Ticket, TicketType, TicketStatus, TicketPriority, TICKET_TYPE_LABELS, TICKET_STATUS_LABELS, TICKET_STATUS_OPTIONS, TICKET_PRIORITY_LABELS } from '../types/ticket';
import { Client, ClientSite, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const CLIENT_STREAM_OPTIONS = [
  { value: 'waste', label: 'Waste Dumpster' },
  { value: 'recycle', label: 'Recycling Dumpster' },
  { value: 'organics', label: 'Organics Dumpster' },
  { value: 'other', label: 'Other / Not Sure' },
] as const;

type ClientStreamOption = (typeof CLIENT_STREAM_OPTIONS)[number]['value'];

type ClientRequestKey =
  | 'missed_pickup'
  | 'extra_pickup'
  | 'bulk_pickup'
  | 'lock_request'
  | 'increase_frequency'
  | 'container_swap'
  | 'contamination'
  | 'compactor_er'
  | 'billing_dispute'
  | 'modify_service'
  | 'other';

const CLIENT_REQUEST_OPTIONS: Array<{ key: ClientRequestKey; label: string; ticketType: TicketType; subjectLabel?: string }> = [
  { key: 'missed_pickup', label: 'Missed Pickup', ticketType: 'missed_pickup' },
  { key: 'extra_pickup', label: 'Extra Pickup', ticketType: 'extra_pickup' },
  { key: 'bulk_pickup', label: 'Bulk Pickup', ticketType: 'extra_pickup', subjectLabel: 'Bulk Pickup' },
  { key: 'lock_request', label: 'Lock Request', ticketType: 'lock_key_issue', subjectLabel: 'Lock Request' },
  { key: 'increase_frequency', label: 'Increase Frequency', ticketType: 'modify_service', subjectLabel: 'Increase Frequency' },
  { key: 'container_swap', label: 'Container Swap', ticketType: 'container_swap' },
  { key: 'contamination', label: 'Contamination', ticketType: 'contamination' },
  { key: 'compactor_er', label: 'Compactor Empty and Return (E&R)', ticketType: 'compactor_maintenance', subjectLabel: 'Compactor Empty and Return (E&R)' },
  { key: 'billing_dispute', label: 'Billing Dispute', ticketType: 'billing_dispute' },
  { key: 'modify_service', label: 'Modify Service', ticketType: 'modify_service' },
  { key: 'other', label: 'Other', ticketType: 'other' },
];

export const TicketsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isClientUser = user?.role === UserRole.CLIENT_USER;
  const isAdminUser = user?.role === UserRole.ADMIN;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoadError, setTicketsLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editTicketForm, setEditTicketForm] = useState<UpdateTicketInput>({
    subject: '',
    description: '',
    ticket_type: 'other',
    status: 'untouched',
    priority: 'medium',
  });
  const [savingTicket, setSavingTicket] = useState(false);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<TicketAttachment[]>([]);
  const [createAttachments, setCreateAttachments] = useState<File[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingMessageStatusId, setUpdatingMessageStatusId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [uploadingMessageFile, setUploadingMessageFile] = useState(false);
  const [isDraggingCorrespondence, setIsDraggingCorrespondence] = useState(false);
  const [pendingCorrespondenceFile, setPendingCorrespondenceFile] = useState<File | null>(null);
  const [downloadingMessageFileId, setDownloadingMessageFileId] = useState<string | null>(null);
  const [adminRecipientType, setAdminRecipientType] = useState<'client' | 'vendor' | 'other'>('client');
  const [adminRecipientEmail, setAdminRecipientEmail] = useState('');
  const [adminEmailSubject, setAdminEmailSubject] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [clientCreateStep, setClientCreateStep] = useState<1 | 2>(1);
  const [clientRequestKey, setClientRequestKey] = useState<ClientRequestKey | ''>('');
  const [clientTicketType, setClientTicketType] = useState<TicketType | ''>('');
  const [clientRequestLabel, setClientRequestLabel] = useState('');
  const [clientServiceStreams, setClientServiceStreams] = useState<ClientStreamOption[]>([]);
  const [clientMissedPickupDate, setClientMissedPickupDate] = useState('');
  const [clientTimingMode, setClientTimingMode] = useState<'asap' | 'date'>('asap');
  const [clientRequestedDate, setClientRequestedDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState<TicketFilters>(
    isClientUser ? { status_bucket: 'open', sort_by: 'newest' } : { status_bucket: 'open', sort_by: 'newest' }
  );
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateTicketInput>({
    client_id: '',
    site_id: '',
    subject: '',
    description: '',
    ticket_type: 'other',
    priority: 'medium',
  });

  const [autoClassification, setAutoClassification] = useState<any>(null);
  const [classifying, setClassifying] = useState(false);
  const [createTicketError, setCreateTicketError] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectCancellation, setShowRejectCancellation] = useState(false);
  const [submittingCancellation, setSubmittingCancellation] = useState(false);
  const [resolvingCancellation, setResolvingCancellation] = useState(false);
  const [showClientCancellationModal, setShowClientCancellationModal] = useState(false);
  const [detailActionFeedback, setDetailActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const getApiErrorMessage = (error: unknown, fallback: string) =>
    (error as any)?.response?.data?.error?.message || fallback;

  const getDefaultClientEmail = (ticket: Ticket | null): string => {
    if (!ticket) return '';
    const match = clients.find((c) => c.id === ticket.client_id);
    return match?.billing_email || match?.email || '';
  };

  const formatRequestNumber = (ticketNumber: string) => `Request #${ticketNumber}`;
  const getClientStreamLabel = (stream: ClientStreamOption) =>
    CLIENT_STREAM_OPTIONS.find((opt) => opt.value === stream)?.label || 'Other / Not Sure';
  const selectedClientRequest = CLIENT_REQUEST_OPTIONS.find((option) => option.key === clientRequestKey);

  const fetchTickets = useCallback(async () => {
    if (isClientUser && !filters.client_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setTicketsLoadError('');
      const response = await ticketsApi.listTickets({
        ...filters,
        search: searchTerm || undefined,
        page,
        limit: 10,
      });
      setTickets(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
      setTicketsLoadError('Unable to load tickets right now. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchTerm, isClientUser]);

  useEffect(() => {
    fetchTickets();
    fetchClients();
  }, [fetchTickets]);

  useEffect(() => {
    if (formData.client_id) {
      fetchSitesForClient(formData.client_id);
    }
  }, [formData.client_id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cancellationStatus = params.get('cancellation_status');
    const clientId = params.get('client_id');
    const statusBucket = params.get('status_bucket');
    const openTicketId = params.get('open_ticket');

    if (
      cancellationStatus === 'pending' ||
      cancellationStatus === 'approved' ||
      cancellationStatus === 'rejected'
    ) {
      setFilters((prev) =>
        prev.cancellation_status === cancellationStatus
          ? prev
          : { ...prev, cancellation_status: cancellationStatus }
      );
    }

    if (clientId) {
      setFilters((prev) => (prev.client_id === clientId ? prev : { ...prev, client_id: clientId }));
    }

    if (statusBucket === 'open' || statusBucket === 'completed' || statusBucket === 'cancelled') {
      setFilters((prev) => (prev.status_bucket === statusBucket ? prev : { ...prev, status_bucket: statusBucket }));
    }

    if (openTicketId) {
      void (async () => {
        try {
          const ticket = await ticketsApi.getTicket(openTicketId, clientId || undefined);
          const [messages, attachments] = await Promise.all([
            ticketsApi.getTicketMessages(ticket.id, ticket.client_id),
            ticketsApi.getTicketAttachments(ticket.id, ticket.client_id),
          ]);
          setSelectedTicket(ticket);
          setEditTicketForm({
            subject: ticket.subject,
            description: ticket.description || '',
            ticket_type: ticket.ticket_type,
            status: ticket.status,
            priority: ticket.priority,
          });
          setTicketMessages(messages);
          setTicketAttachments(attachments);
          setShowDetailModal(true);
          setDetailActionFeedback(null);
          setNewMessage('');
          setPendingCorrespondenceFile(null);
          setAdminRecipientType('client');
          setAdminRecipientEmail(getDefaultClientEmail(ticket));
          setAdminEmailSubject(`Request #${ticket.ticket_number}: ${ticket.subject}`);
          const updatedParams = new URLSearchParams(location.search);
          updatedParams.delete('open_ticket');
          navigate(`/tickets${updatedParams.toString() ? `?${updatedParams.toString()}` : ''}`, { replace: true });
        } catch (error) {
          console.error('Failed to open deep-linked ticket:', error);
        }
      })();
    }
  }, [location.search]);

  useEffect(() => {
    if (!isClientUser || clients.length === 0) {
      return;
    }

    const ownClient = clients[0];
    setFilters((prev) => (prev.client_id === ownClient.id ? prev : { ...prev, client_id: ownClient.id }));
    if (ownClient && formData.client_id !== ownClient.id) {
      setFormData((prev) => ({
        ...prev,
        client_id: ownClient.id,
      }));
    }
  }, [isClientUser, clients, formData.client_id]);

  useEffect(() => {
    if (!isClientUser || sites.length === 0) {
      return;
    }

    const defaultSite = sites.find((site) => site.is_active) || sites[0];
    if (defaultSite && formData.site_id !== defaultSite.id) {
      setFormData((prev) => ({
        ...prev,
        site_id: defaultSite.id,
      }));
    }
  }, [isClientUser, sites, formData.site_id]);

  useEffect(() => {
    if (isClientUser || !selectedTicket) return;
    if (adminRecipientType !== 'client') return;
    if (adminRecipientEmail.trim()) return;
    const defaultClientEmail = getDefaultClientEmail(selectedTicket);
    if (defaultClientEmail) {
      setAdminRecipientEmail(defaultClientEmail);
    }
  }, [isClientUser, selectedTicket, adminRecipientType, adminRecipientEmail, clients]);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.listClients({ limit: 100 });
      setClients(response.items);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchSitesForClient = async (clientId: string) => {
    try {
      const response = await clientsApi.listSites({ clientId: clientId, limit: 100 });
      setSites(response.items);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const handleAutoClassify = async () => {
    if (!formData.subject) return;

    try {
      setClassifying(true);
      const result = await ticketsApi.classifyTicket(formData.subject, formData.description);
      setAutoClassification(result);

      // Auto-fill suggested values
      setFormData((prev) => ({
        ...prev,
        ticket_type: result.ticket_type,
        priority: isClientUser ? 'medium' : result.priority,
      }));
    } catch (error) {
      console.error('Auto-classification failed:', error);
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingTicket(true);
      setCreateTicketError('');
      const ownClient = clients[0];
      const defaultSite = sites.find((site) => site.is_active) || sites[0];

      if (isClientUser) {
        if (!clientTicketType) {
          setCreateTicketError('Please choose what you need help with.');
          return;
        }
        if (
          selectedClientRequest?.key !== 'compactor_er' &&
          selectedClientRequest?.key !== 'billing_dispute' &&
          selectedClientRequest?.key !== 'other' &&
          clientServiceStreams.length === 0
        ) {
          setCreateTicketError('Please choose at least one waste stream.');
          return;
        }
        if (selectedClientRequest?.key === 'missed_pickup' && !clientMissedPickupDate) {
          setCreateTicketError('Please choose the date the missed pickup happened.');
          return;
        }
        if (
          (selectedClientRequest?.key === 'extra_pickup' ||
            selectedClientRequest?.key === 'bulk_pickup' ||
            selectedClientRequest?.key === 'compactor_er') &&
          clientTimingMode === 'date' &&
          !clientRequestedDate
        ) {
          setCreateTicketError('Please choose the requested date.');
          return;
        }
        if (selectedClientRequest?.key === 'extra_pickup' && clientTimingMode === 'date') {
          const selected = new Date(clientRequestedDate);
          const tomorrow = new Date();
          tomorrow.setHours(0, 0, 0, 0);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (selected < tomorrow) {
            setCreateTicketError('Extra pickup date must be at least 24 hours in advance.');
            return;
          }
        }
        if (
          ['bulk_pickup', 'contamination', 'billing_dispute', 'modify_service', 'increase_frequency', 'container_swap', 'other'].includes(
            selectedClientRequest?.key || ''
          ) &&
          !(formData.description || '').trim()
        ) {
          setCreateTicketError('Please add details for this request.');
          return;
        }
      }

      const streamSummary = isClientUser
        ? clientServiceStreams.map((stream) => getClientStreamLabel(stream)).join(', ')
        : '';

      const clientMetaLines: string[] = [];
      if (isClientUser && streamSummary) {
        clientMetaLines.push(`Service stream(s): ${streamSummary}`);
      }
      if (isClientUser && selectedClientRequest?.key === 'missed_pickup' && clientMissedPickupDate) {
        clientMetaLines.push(`Missed pickup date: ${new Date(clientMissedPickupDate).toLocaleDateString()}`);
      }
      if (
        isClientUser &&
        (selectedClientRequest?.key === 'extra_pickup' ||
          selectedClientRequest?.key === 'bulk_pickup' ||
          selectedClientRequest?.key === 'compactor_er')
      ) {
        clientMetaLines.push(
          clientTimingMode === 'asap'
            ? 'Requested time: ASAP'
            : `Requested date: ${new Date(clientRequestedDate).toLocaleDateString()}`
        );
      }

      const clientSubject = isClientUser
        ? `${clientRequestLabel || TICKET_TYPE_LABELS[clientTicketType as TicketType]}${
            streamSummary ? ` - ${streamSummary}` : ''
          }`
        : formData.subject;

      const clientDescription = isClientUser
        ? `${clientMetaLines.join('\n')}${formData.description?.trim() ? `\n\n${formData.description.trim()}` : ''}`
        : formData.description;

      const payload: CreateTicketInput = {
        ...formData,
        client_id: isClientUser ? ownClient?.id || formData.client_id : formData.client_id,
        site_id: isClientUser ? defaultSite?.id || undefined : (formData.site_id || undefined),
        subject: clientSubject,
        description: clientDescription,
        ticket_type: isClientUser ? (clientTicketType as TicketType) : formData.ticket_type,
        priority: isClientUser ? undefined : formData.priority,
      };

      const createdTicket = await ticketsApi.createTicket(payload);

      if (createAttachments.length > 0) {
        setUploadingAttachments(true);
        await ticketsApi.uploadTicketAttachments(createdTicket.id, createAttachments);
      }

      setPage(1);
      setShowModal(false);
      resetForm();
      fetchTickets();
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      setCreateTicketError(error?.response?.data?.error?.message || 'Failed to create ticket. Please try again.');
    } finally {
      setCreatingTicket(false);
      setUploadingAttachments(false);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const [ticketDetails, messages, attachments] = await Promise.all([
        ticketsApi.getTicket(ticket.id, isClientUser ? ticket.client_id : undefined),
        ticketsApi.getTicketMessages(ticket.id, isClientUser ? ticket.client_id : undefined),
        ticketsApi.getTicketAttachments(ticket.id, isClientUser ? ticket.client_id : undefined),
      ]);

      setSelectedTicket(ticketDetails);
      setEditTicketForm({
        subject: ticketDetails.subject,
        description: ticketDetails.description || '',
        ticket_type: ticketDetails.ticket_type,
        status: ticketDetails.status,
        priority: ticketDetails.priority,
      });
      setTicketMessages(messages);
      setTicketAttachments(attachments);
      setPendingCorrespondenceFile(null);
      setAdminRecipientType('client');
      setAdminRecipientEmail(getDefaultClientEmail(ticketDetails));
      setAdminEmailSubject(`Request #${ticketDetails.ticket_number}: ${ticketDetails.subject}`);
      setCancellationReason('');
      setRejectionReason('');
      setShowRejectCancellation(false);
      setDetailActionFeedback(null);
    } catch (error) {
      console.error('Failed to load ticket details:', error);
      setSelectedTicket(ticket);
      setEditTicketForm({
        subject: ticket.subject,
        description: ticket.description || '',
        ticket_type: ticket.ticket_type,
        status: ticket.status,
        priority: ticket.priority,
      });
      setTicketMessages([]);
      setTicketAttachments([]);
      setPendingCorrespondenceFile(null);
      setAdminRecipientType('client');
      setAdminRecipientEmail(getDefaultClientEmail(ticket));
      setAdminEmailSubject(`Request #${ticket.ticket_number}: ${ticket.subject}`);
      setCancellationReason('');
      setRejectionReason('');
      setShowRejectCancellation(false);
      setDetailActionFeedback({
        type: 'error',
        message: 'Could not load full ticket details. Showing limited information.',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveTicket = async () => {
    if (!selectedTicket) return;
    try {
      setSavingTicket(true);

      const payload: UpdateTicketInput = isClientUser
        ? {
            subject: editTicketForm.subject,
            description: editTicketForm.description,
            ticket_type: editTicketForm.ticket_type,
          }
        : {
            ...editTicketForm,
          };

      const updated = await ticketsApi.updateTicket(
        selectedTicket.id,
        payload,
        isClientUser ? selectedTicket.client_id : undefined
      );
      setSelectedTicket(updated);
      fetchTickets();
      setDetailActionFeedback({
        type: 'success',
        message: 'Ticket changes saved.',
      });
    } catch (error) {
      console.error('Failed to update ticket:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to save ticket changes.'),
      });
    } finally {
      setSavingTicket(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && !pendingCorrespondenceFile)) return;
    try {
      setSendingMessage(true);
      const recipientType = isClientUser ? 'client' : adminRecipientType;
      const recipientEmail = isClientUser ? undefined : adminRecipientEmail.trim() || undefined;
      const emailSubject = isClientUser ? undefined : (adminEmailSubject.trim() || undefined);

      if (!isClientUser && (recipientType === 'vendor' || recipientType === 'other') && !recipientEmail) {
        setDetailActionFeedback({
          type: 'error',
          message: 'Recipient email is required when sending to Vendor or Other.',
        });
        return;
      }

      if (pendingCorrespondenceFile) {
        await ticketsApi.uploadTicketMessageFile(
          selectedTicket.id,
          pendingCorrespondenceFile,
          isClientUser ? selectedTicket.client_id : undefined,
          newMessage.trim(),
          recipientType,
          recipientEmail,
          emailSubject
        );
      } else {
        await ticketsApi.addTicketMessage(
          selectedTicket.id,
          newMessage.trim(),
          false,
          isClientUser ? selectedTicket.client_id : undefined
          ,
          undefined,
          recipientType,
          recipientEmail,
          emailSubject
        );
      }
      const messages = await ticketsApi.getTicketMessages(
        selectedTicket.id,
        isClientUser ? selectedTicket.client_id : undefined
      );
      setTicketMessages(messages);
      setNewMessage('');
      setPendingCorrespondenceFile(null);
      setDetailActionFeedback({
        type: 'success',
        message: pendingCorrespondenceFile ? 'Correspondence saved from uploaded email file.' : 'Correspondence sent.',
      });
    } catch (error) {
      console.error('Failed to send ticket message:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to send correspondence.'),
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const prepareCorrespondenceDraftFromFile = async (file: File) => {
    try {
      setUploadingMessageFile(true);
      const lowerName = file.name.toLowerCase();
      const canReadAsText = lowerName.endsWith('.eml') || lowerName.endsWith('.txt');
      let bodyText = '';

      if (canReadAsText) {
        const raw = await file.text();
        const cleaned = raw.replace(/\u0000/g, '').trim();
        const fromMatch = cleaned.match(/^From:\s*(.+)$/im);
        const toMatch = cleaned.match(/^To:\s*(.+)$/im);
        const subjectMatch = cleaned.match(/^Subject:\s*(.+)$/im);
        const sections = cleaned.split(/\r?\n\r?\n/);
        const extractedBody = sections.length > 1 ? sections.slice(1).join('\n\n').trim() : cleaned;
        const headerLines = [
          fromMatch?.[1]?.trim() ? `From: ${fromMatch[1].trim()}` : '',
          toMatch?.[1]?.trim() ? `To: ${toMatch[1].trim()}` : '',
          subjectMatch?.[1]?.trim() ? `Subject: ${subjectMatch[1].trim()}` : '',
        ].filter(Boolean);

        bodyText = `Uploaded correspondence file: ${file.name}`;
        if (headerLines.length > 0) {
          bodyText += `\n${headerLines.join('\n')}`;
        }
        if (extractedBody) {
          bodyText += `\n\n${extractedBody}`;
        }
      } else {
        bodyText = `Uploaded correspondence file: ${file.name}\n\n(Email/message text will be extracted when you click Send Message.)`;
      }

      setPendingCorrespondenceFile(file);
      setNewMessage(bodyText);
      setDetailActionFeedback({
        type: 'success',
        message: `File ready. Review the message and click Send Message to save correspondence.`,
      });
    } catch (error) {
      console.error('Failed to prepare correspondence draft:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to prepare correspondence from file.'),
      });
    } finally {
      setUploadingMessageFile(false);
    }
  };

  const handleUploadCorrespondenceFiles = async (files: File[]) => {
    if (!selectedTicket || files.length === 0) return;
    const [first] = files;
    await prepareCorrespondenceDraftFromFile(first);
    if (files.length > 1) {
      setDetailActionFeedback({
        type: 'success',
        message: `Prepared ${first.name}. Additional files were ignored for now; upload one file per message.`,
      });
    }
  };

  const handleCorrespondenceDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdminUser || !selectedTicket) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingCorrespondence(true);
  };

  const handleCorrespondenceDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdminUser || !selectedTicket) return;
    e.preventDefault();
    setIsDraggingCorrespondence(false);
  };

  const handleCorrespondenceDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdminUser || !selectedTicket) return;
    e.preventDefault();
    setIsDraggingCorrespondence(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;

    const allowed = droppedFiles.filter((file) =>
      /\.(eml|msg|txt|pdf)$/i.test(file.name)
    );

    if (allowed.length === 0) {
      setDetailActionFeedback({
        type: 'error',
        message: 'Only .eml, .msg, .txt, and .pdf files can be dropped.',
      });
      return;
    }

    await handleUploadCorrespondenceFiles(allowed);
  };

  const handleUpdateMessageStatusTag = async (
    messageId: string,
    statusTag: Exclude<TicketStatus, 'cancelled'> | null
  ) => {
    if (!selectedTicket || isClientUser) return;

    try {
      setUpdatingMessageStatusId(messageId);
      await ticketsApi.updateTicketMessageStatus(selectedTicket.id, messageId, statusTag);
      const messages = await ticketsApi.getTicketMessages(selectedTicket.id);
      setTicketMessages(messages);
      setDetailActionFeedback({
        type: 'success',
        message: 'Message tag updated.',
      });
    } catch (error) {
      console.error('Failed to update message status tag:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update message tag.'),
      });
    } finally {
      setUpdatingMessageStatusId(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedTicket || !isAdminUser) return;

    const confirmed = window.confirm('Delete this correspondence message? This cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingMessageId(messageId);
      await ticketsApi.deleteTicketMessage(selectedTicket.id, messageId);
      const messages = await ticketsApi.getTicketMessages(selectedTicket.id);
      setTicketMessages(messages);
      setDetailActionFeedback({
        type: 'success',
        message: 'Correspondence message deleted.',
      });
    } catch (error) {
      console.error('Failed to delete correspondence message:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to delete correspondence message.'),
      });
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleDownloadMessageFile = async (messageId: string) => {
    if (!selectedTicket) return;
    try {
      setDownloadingMessageFileId(messageId);
      await ticketsApi.downloadTicketMessageFile(
        selectedTicket.id,
        messageId,
        isClientUser ? selectedTicket.client_id : undefined
      );
    } catch (error) {
      console.error('Failed to download correspondence file:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to download email file.'),
      });
    } finally {
      setDownloadingMessageFileId(null);
    }
  };

  const handleUploadAttachmentsToTicket = async (files: File[]) => {
    if (!selectedTicket || files.length === 0) return;
    try {
      setUploadingAttachments(true);
      await ticketsApi.uploadTicketAttachments(
        selectedTicket.id,
        files,
        isClientUser ? selectedTicket.client_id : undefined
      );
      const attachments = await ticketsApi.getTicketAttachments(
        selectedTicket.id,
        isClientUser ? selectedTicket.client_id : undefined
      );
      setTicketAttachments(attachments);
      setDetailActionFeedback({
        type: 'success',
        message: 'Attachment upload complete.',
      });
    } catch (error) {
      console.error('Failed to upload ticket attachments:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to upload attachment(s).'),
      });
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await ticketsApi.updateTicket(ticketId, { status: newStatus });
      fetchTickets();
      setShowDetailModal(false);
      setSelectedTicket(null);
      setTicketMessages([]);
      setTicketAttachments([]);
      setDetailActionFeedback(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update ticket status.'),
      });
    }
  };

  const handleRequestCancellation = async () => {
    if (!selectedTicket || !cancellationReason.trim()) return;
    try {
      setSubmittingCancellation(true);
      const updated = await ticketsApi.requestTicketCancellation(
        selectedTicket.id,
        cancellationReason.trim(),
        isClientUser ? selectedTicket.client_id : undefined
      );
      setSelectedTicket(updated);
      setCancellationReason('');
      setShowClientCancellationModal(false);
      fetchTickets();
      const messages = await ticketsApi.getTicketMessages(
        selectedTicket.id,
        isClientUser ? selectedTicket.client_id : undefined
      );
      setTicketMessages(messages);
      setDetailActionFeedback({
        type: 'success',
        message: 'Cancellation request submitted.',
      });
    } catch (error) {
      console.error('Failed to request cancellation:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to request cancellation.'),
      });
    } finally {
      setSubmittingCancellation(false);
    }
  };

  const handleApproveCancellation = async () => {
    if (!selectedTicket) return;
    try {
      setResolvingCancellation(true);
      const updated = await ticketsApi.approveTicketCancellation(selectedTicket.id);
      setSelectedTicket(updated);
      setShowRejectCancellation(false);
      setRejectionReason('');
      fetchTickets();
      const messages = await ticketsApi.getTicketMessages(selectedTicket.id);
      setTicketMessages(messages);
      setDetailActionFeedback({
        type: 'success',
        message: 'Cancellation approved and ticket cancelled.',
      });
    } catch (error) {
      console.error('Failed to approve cancellation:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to approve cancellation request.'),
      });
    } finally {
      setResolvingCancellation(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!selectedTicket || !rejectionReason.trim()) return;
    try {
      setResolvingCancellation(true);
      const updated = await ticketsApi.rejectTicketCancellation(selectedTicket.id, rejectionReason.trim());
      setSelectedTicket(updated);
      setShowRejectCancellation(false);
      setRejectionReason('');
      fetchTickets();
      const messages = await ticketsApi.getTicketMessages(selectedTicket.id);
      setTicketMessages(messages);
      setDetailActionFeedback({
        type: 'success',
        message: 'Cancellation rejection submitted.',
      });
    } catch (error) {
      console.error('Failed to reject cancellation:', error);
      setDetailActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to reject cancellation request.'),
      });
    } finally {
      setResolvingCancellation(false);
    }
  };

  const resetForm = () => {
    const ownClient = clients[0];
    const defaultSite = sites.find((site) => site.is_active) || sites[0];

    setFormData({
      client_id: isClientUser ? ownClient?.id || '' : '',
      site_id: isClientUser ? defaultSite?.id || '' : '',
      subject: '',
      description: '',
      ticket_type: 'other',
      priority: 'medium',
    });
    setAutoClassification(null);
    setCreateTicketError('');
    setCreateAttachments([]);
    setClientCreateStep(1);
    setClientRequestKey('');
    setClientTicketType('');
    setClientRequestLabel('');
    setClientServiceStreams([]);
    setClientMissedPickupDate('');
    setClientTimingMode('asap');
    setClientRequestedDate('');
  };

  const getStatusBadgeColor = (status: TicketStatus): string => {
    const colors: Record<TicketStatus, string> = {
      untouched: 'bg-slate-100 text-slate-800 border-slate-300',
      client_approval: 'bg-blue-100 text-blue-800 border-blue-300',
      vendor_rates: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      quoted_to_client: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      response_from_vendor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      response_from_client: 'bg-lime-100 text-lime-800 border-lime-300',
      completed: 'bg-success-light/20 text-success-dark border-success',
      eta_received_from_vendor: 'bg-violet-100 text-violet-800 border-violet-300',
      eta_provided_to_client: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
      waiting_on_client_info: 'bg-amber-100 text-amber-800 border-amber-300',
      waiting_on_vendor_info: 'bg-orange-100 text-orange-800 border-orange-300',
      cancelled: 'bg-danger-light/20 text-danger-dark border-danger',
    };
    return colors[status] || 'bg-secondary-100 text-secondary-600';
  };

  const getPriorityBadgeColor = (priority: TicketPriority): string => {
    const colors: Record<TicketPriority, string> = {
      low: 'bg-secondary-100 text-secondary-600',
      medium: 'bg-info-light/20 text-info-dark',
      high: 'bg-warning-light/20 text-warning-dark',
      urgent: 'bg-danger-light/20 text-danger-dark',
    };
    return colors[priority];
  };

  const getSLAStatus = (slaDueAt: string | null): { text: string; color: string } => {
    if (!slaDueAt) return { text: 'No SLA', color: 'text-secondary-500' };

    const now = new Date();
    const due = new Date(slaDueAt);
    const diff = due.getTime() - now.getTime();
    const hoursLeft = diff / (1000 * 60 * 60);

    if (diff < 0) {
      return { text: 'Overdue', color: 'text-danger font-semibold' };
    } else if (hoursLeft < 6) {
      return { text: `${Math.round(hoursLeft)}h left`, color: 'text-warning-dark font-semibold' };
    } else {
      return { text: `${Math.round(hoursLeft)}h left`, color: 'text-success-dark' };
    }
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown';
  };

  const getTicketSiteLabel = (ticket: Ticket) => {
    if (!ticket.site_id) return 'Unassigned site';
    const site = sites.find((s) => s.id === ticket.site_id);
    if (!site) return 'Site';
    return `${site.name}${site.city ? `, ${site.city}` : ''}`;
  };

  const getClientProgress = (ticket: Ticket): 'In Progress' | 'Completed' | 'Cancelled' => {
    const displayStatus = getDisplayStatus(ticket);
    if (displayStatus === 'completed') return 'Completed';
    if (displayStatus === 'cancelled') return 'Cancelled';
    return 'In Progress';
  };

  const getClientProgressBadge = (progress: 'In Progress' | 'Completed' | 'Cancelled') => {
    if (progress === 'Completed') return 'bg-success-light/25 text-success-dark border-success/40';
    if (progress === 'Cancelled') return 'bg-danger-light/20 text-danger-dark border-danger/40';
    return 'bg-info-light/20 text-info-dark border-info/40';
  };

  const getCancellationRequest = (ticket: Ticket) => ticket.metadata?.cancellation_request as
    | {
        status?: 'pending' | 'approved' | 'rejected';
        reason?: string;
        decision_reason?: string;
      }
    | undefined;

  const isCancellationPending = (ticket: Ticket) => getCancellationRequest(ticket)?.status === 'pending';

  const getDisplayStatus = (ticket: Ticket): TicketStatus => {
    if (isClientUser && isCancellationPending(ticket)) {
      return 'cancelled';
    }
    return ticket.status;
  };

  const selectedClient = clients.find((client) => client.id === formData.client_id) || clients[0];
  const selectedSite = sites.find((site) => site.id === formData.site_id) || (isClientUser ? (sites.find((site) => site.is_active) || sites[0]) : undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="page-title">Tickets</h1>
              <p className="page-subtitle">Manage service requests and issues</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                cancellation_status: undefined,
                status: undefined,
                status_bucket: 'open',
              }));
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              (filters.status_bucket || 'open') === 'open'
                ? 'bg-success text-white border-success'
                : 'bg-white text-secondary-700 border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            Open Tickets
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                cancellation_status: undefined,
                status: undefined,
                status_bucket: 'completed',
              }));
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              filters.status_bucket === 'completed'
                ? 'bg-success text-white border-success'
                : 'bg-white text-secondary-700 border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            Completed Tickets
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                cancellation_status: undefined,
                status: undefined,
                status_bucket: 'cancelled',
              }));
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              filters.status_bucket === 'cancelled'
                ? 'bg-danger text-white border-danger'
                : 'bg-white text-secondary-700 border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            Cancelled Tickets
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isClientUser ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4`}>
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by ticket #, client, or site..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {!isClientUser && (
              <>
                {/* Status Filter */}
                <div>
                  <select
                    className="input"
                    value={filters.status || ''}
                    onChange={(e) => {
                      setFilters({ ...filters, status: e.target.value as TicketStatus || undefined });
                      setPage(1);
                    }}
                  >
                    <option value="">All Statuses</option>
                    {TICKET_STATUS_OPTIONS.map((value) => (
                      <option key={value} value={value}>{TICKET_STATUS_LABELS[value]}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <select
                    className="input"
                    value={filters.priority || ''}
                    onChange={(e) => {
                      setFilters({ ...filters, priority: e.target.value as TicketPriority || undefined });
                      setPage(1);
                    }}
                  >
                    <option value="">All Priorities</option>
                    {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Sort Filter */}
            <div>
              <select
                className="input"
                value={filters.sort_by || 'newest'}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    sort_by: e.target.value as 'newest' | 'oldest' | 'last_touched' | 'last_touched_oldest',
                  });
                  setPage(1);
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="last_touched">Recently Updated</option>
                <option value="last_touched_oldest">Needs Follow-Up</option>
              </select>
            </div>
          </div>
        </div>

        {ticketsLoadError && (
          <div className="mb-6 rounded-lg border border-danger bg-danger-light/20 px-4 py-3 text-sm text-danger-dark">
            {ticketsLoadError}
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-secondary-600">Loading tickets...</span>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-primary-50 mb-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No tickets found</h3>
            <p className="text-secondary-600 mb-6">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Try adjusting your filters'
                : 'Get started by creating your first ticket'}
            </p>
            {!searchTerm && Object.keys(filters).length === 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Create Your First Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      {isClientUser ? 'Location' : 'Client'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      {isClientUser ? 'Progress' : 'Status'}
                    </th>
                    {!isClientUser && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                          SLA
                        </th>
                      </>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {tickets.map((ticket) => {
                    const slaStatus = getSLAStatus(ticket.sla_due_at);
                    const displayStatus = getDisplayStatus(ticket);
                    const cancellationPending = isCancellationPending(ticket);
                    const clientProgress = getClientProgress(ticket);
                    return (
                      <tr
                        key={ticket.id}
                        className="hover:bg-secondary-50 transition-colors cursor-pointer"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center">
                              <button
                                onClick={() => handleViewTicket(ticket)}
                                onClickCapture={(e) => e.stopPropagation()}
                                className="text-sm font-semibold text-primary-600 hover:text-primary-900"
                              >
                                {formatRequestNumber(ticket.ticket_number)}
                              </button>
                              {ticket.is_escalated && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger-light/20 text-danger-dark">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Escalated
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-secondary-500 mt-1">{ticket.subject}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-secondary-900">
                            {isClientUser ? getTicketSiteLabel(ticket) : getClientName(ticket.client_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-primary text-xs">
                            {TICKET_TYPE_LABELS[ticket.ticket_type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isClientUser ? (
                            <span className={`badge border ${getClientProgressBadge(clientProgress)}`}>
                              {clientProgress}
                            </span>
                          ) : (
                            <span className={`badge border ${getStatusBadgeColor(displayStatus)}`}>
                              {TICKET_STATUS_LABELS[displayStatus]}
                            </span>
                          )}
                          {!isClientUser && cancellationPending && (
                            <span className="ml-2 badge bg-warning-light/20 text-warning-dark border border-warning">
                              Cancellation Pending
                            </span>
                          )}
                        </td>
                        {!isClientUser && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`badge ${getPriorityBadgeColor(ticket.priority)}`}>
                                {TICKET_PRIORITY_LABELS[ticket.priority]}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-xs ${slaStatus.color}`}>
                                {slaStatus.text}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTicket(ticket);
                            }}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-secondary-300 bg-white text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="relative inline-flex items-center px-6 py-2 border-t border-b border-secondary-300 bg-white text-sm font-medium text-secondary-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-secondary-300 bg-white text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Create Ticket Modal */}
        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-slide-up">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-secondary-900">Create New Ticket</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          resetForm();
                        }}
                        className="text-secondary-400 hover:text-secondary-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {createTicketError && (
                        <div className="rounded-lg bg-danger-light/20 border border-danger p-3 text-sm text-danger-dark">
                          {createTicketError}
                        </div>
                      )}

                      {isClientUser ? (
                        <div className="space-y-5">
                          <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-secondary-500">
                              <span>Step {clientCreateStep} of 2</span>
                              <span>{clientCreateStep === 1 ? 'Choose Request Type' : 'Choose Dumpster + Details'}</span>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-secondary-200">
                              <div
                                className="h-2 rounded-full bg-success transition-all"
                                style={{ width: clientCreateStep === 1 ? '50%' : '100%' }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <label className="block text-sm font-medium text-secondary-700 mb-2">
                                Client
                              </label>
                              <div className="input bg-secondary-50 text-secondary-700">
                                {selectedClient?.name || 'Assigned client'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-secondary-700 mb-2">
                                Site
                              </label>
                              <div className="input bg-secondary-50 text-secondary-700">
                                {selectedSite ? `${selectedSite.name} - ${selectedSite.address}` : 'Assigned automatically'}
                              </div>
                            </div>
                          </div>

                          {clientCreateStep === 1 ? (
                            <div>
                              <label className="block text-sm font-medium text-secondary-700 mb-2">
                                What do you need help with? *
                              </label>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {CLIENT_REQUEST_OPTIONS.map((option) => (
                                  <button
                                    key={option.label}
                                    type="button"
                                    onClick={() => {
                                      setClientRequestKey(option.key);
                                      setClientTicketType(option.ticketType);
                                      setClientRequestLabel(option.subjectLabel || option.label);
                                      setFormData((prev) => ({ ...prev, ticket_type: option.ticketType }));
                                      setClientServiceStreams([]);
                                      setClientMissedPickupDate('');
                                      setClientTimingMode('asap');
                                      setClientRequestedDate('');
                                    }}
                                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                      clientRequestKey === option.key
                                        ? 'border-success bg-success-light/20 ring-2 ring-success/20'
                                        : 'border-secondary-200 bg-white hover:border-secondary-300'
                                    }`}
                                  >
                                    <p className="text-sm font-semibold text-secondary-900">{option.label}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2">
                                <p className="text-xs uppercase tracking-wide text-secondary-500">Selected Request Type</p>
                                <p className="mt-0.5 text-sm font-semibold text-secondary-900">
                                  {selectedClientRequest?.label || clientRequestLabel || 'Not selected'}
                                </p>
                              </div>

                              {selectedClientRequest?.key !== 'compactor_er' &&
                                selectedClientRequest?.key !== 'billing_dispute' && (
                                  <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                                      Which waste stream(s) is this for? *
                                    </label>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                      {CLIENT_STREAM_OPTIONS.map((option) => {
                                        const selected = clientServiceStreams.includes(option.value);
                                        return (
                                          <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                              setClientServiceStreams((prev) =>
                                                prev.includes(option.value)
                                                  ? prev.filter((value) => value !== option.value)
                                                  : [...prev, option.value]
                                              );
                                            }}
                                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                              selected
                                                ? 'border-success bg-success-light/20 ring-2 ring-success/20'
                                                : 'border-secondary-200 bg-white hover:border-secondary-300'
                                            }`}
                                          >
                                            <p className="text-sm font-semibold text-secondary-900">{option.label}</p>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <p className="mt-2 text-xs text-secondary-600">
                                      Select all that apply.
                                    </p>
                                  </div>
                                )}

                              {selectedClientRequest?.key === 'missed_pickup' && (
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                                    Date of missed pickup *
                                  </label>
                                  <input
                                    type="date"
                                    className="input"
                                    value={clientMissedPickupDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setClientMissedPickupDate(e.target.value)}
                                    required
                                  />
                                </div>
                              )}

                              {(selectedClientRequest?.key === 'extra_pickup' ||
                                selectedClientRequest?.key === 'bulk_pickup' ||
                                selectedClientRequest?.key === 'compactor_er') && (
                                <div className="space-y-3">
                                  <label className="block text-sm font-medium text-secondary-700">
                                    {selectedClientRequest?.key === 'extra_pickup' || selectedClientRequest?.key === 'bulk_pickup'
                                      ? 'When do you need service? *'
                                      : 'When should this be scheduled? *'}
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                                        clientTimingMode === 'asap'
                                          ? 'border-success bg-success-light/20 text-success-dark'
                                          : 'border-secondary-300 bg-white text-secondary-700 hover:border-secondary-400'
                                      }`}
                                      onClick={() => setClientTimingMode('asap')}
                                    >
                                      ASAP
                                    </button>
                                    <button
                                      type="button"
                                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                                        clientTimingMode === 'date'
                                          ? 'border-success bg-success-light/20 text-success-dark'
                                          : 'border-secondary-300 bg-white text-secondary-700 hover:border-secondary-400'
                                      }`}
                                      onClick={() => setClientTimingMode('date')}
                                    >
                                      Choose Date
                                    </button>
                                  </div>
                                  {clientTimingMode === 'date' && (
                                    <input
                                      type="date"
                                      className="input"
                                      value={clientRequestedDate}
                                      min={
                                        selectedClientRequest?.key === 'extra_pickup'
                                          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                          : new Date().toISOString().split('T')[0]
                                      }
                                      onChange={(e) => setClientRequestedDate(e.target.value)}
                                      required
                                    />
                                  )}
                                  {selectedClientRequest?.key === 'extra_pickup' && (
                                    <p className="text-xs text-secondary-600">Scheduled dates must be at least 24 hours in advance.</p>
                                  )}
                                </div>
                              )}

                              <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">
                                  {selectedClientRequest?.key === 'container_swap' ? 'Reason for Request' : 'Description'}
                                  {['bulk_pickup', 'contamination', 'billing_dispute', 'modify_service', 'increase_frequency', 'container_swap', 'other'].includes(
                                    selectedClientRequest?.key || ''
                                  )
                                    ? ' *'
                                    : ' (optional)'}
                                </label>
                                <textarea
                                  name="description"
                                  rows={4}
                                  className="input"
                                  placeholder="Anything else we should know?"
                                  value={formData.description}
                                  onChange={handleChange}
                                  required={['bulk_pickup', 'contamination', 'billing_dispute', 'modify_service', 'increase_frequency', 'container_swap', 'other'].includes(
                                    selectedClientRequest?.key || ''
                                  )}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">
                                  Attach photos or PDFs (optional)
                                </label>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*,.pdf"
                                  className="input"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setCreateAttachments(files);
                                  }}
                                />
                                {createAttachments.length > 0 && (
                                  <p className="mt-2 text-xs text-secondary-600">
                                    {createAttachments.length} file(s) selected
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Client *
                            </label>
                            <select
                              name="client_id"
                              required
                              className="input"
                              value={formData.client_id}
                              onChange={handleChange}
                            >
                              <option value="">Select client</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {client.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Site (optional)
                            </label>
                            <select
                              name="site_id"
                              className="input"
                              value={formData.site_id}
                              onChange={handleChange}
                              disabled={!formData.client_id}
                            >
                              <option value="">Select site</option>
                              {sites.map((site) => (
                                <option key={site.id} value={site.id}>
                                  {site.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {!isClientUser && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Subject *
                            </label>
                            <input
                              type="text"
                              name="subject"
                              required
                              className="input"
                              placeholder="Brief description of the issue"
                              value={formData.subject}
                              onChange={handleChange}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Description
                            </label>
                            <textarea
                              name="description"
                              rows={4}
                              className="input"
                              placeholder="Detailed description..."
                              value={formData.description}
                              onChange={handleChange}
                            />
                          </div>
                        </>
                      )}

                      {/* Auto-Classification */}
                      {!isClientUser && formData.subject && (
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-primary-900">AI Classification</span>
                            <button
                              type="button"
                              onClick={handleAutoClassify}
                              disabled={classifying}
                              className="text-xs btn-secondary py-1 px-3"
                            >
                              {classifying ? 'Analyzing...' : 'Auto-Classify'}
                            </button>
                          </div>
                          {autoClassification && (
                            <div className="text-xs text-primary-700 space-y-1">
                              <div>Suggested Type: <strong>{TICKET_TYPE_LABELS[autoClassification.ticket_type as TicketType]}</strong></div>
                              {!isClientUser && (
                                <div>Suggested Priority: <strong>{TICKET_PRIORITY_LABELS[autoClassification.priority as TicketPriority]}</strong></div>
                              )}
                              <div>Confidence: <strong>{Math.round(autoClassification.confidence * 100)}%</strong></div>
                              <div>Estimated SLA: <strong>{autoClassification.estimated_sla_hours}h</strong></div>
                            </div>
                          )}
                        </div>
                      )}

                      {!isClientUser && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Type *
                            </label>
                            <select
                              name="ticket_type"
                              className="input"
                              value={formData.ticket_type}
                              onChange={handleChange}
                            >
                              {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Priority *
                            </label>
                            <select
                              name="priority"
                              className="input"
                              value={formData.priority}
                              onChange={handleChange}
                            >
                              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {!isClientUser && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            Attach photos or PDFs (optional)
                          </label>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            className="input"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setCreateAttachments(files);
                            }}
                          />
                          {createAttachments.length > 0 && (
                            <p className="mt-2 text-xs text-secondary-600">
                              {createAttachments.length} file(s) selected
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    {isClientUser && clientCreateStep === 1 ? (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!clientTicketType}
                        onClick={() => {
                          if (!clientTicketType) {
                            setCreateTicketError('Please choose what you need help with.');
                            return;
                          }
                          setCreateTicketError('');
                          setClientCreateStep(2);
                        }}
                      >
                        Continue
                      </button>
                    ) : (
                      <>
                        {isClientUser && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setClientCreateStep(1)}
                          >
                            Back
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={creatingTicket || uploadingAttachments}
                          className="btn-primary"
                        >
                          {creatingTicket
                            ? (uploadingAttachments ? 'Uploading files...' : 'Creating...')
                            : (isClientUser ? 'Submit Request' : 'Create Ticket')}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {showDetailModal && selectedTicket && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
                onClick={() => {
                  setShowDetailModal(false);
                  setShowClientCancellationModal(false);
                }}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-6 sm:align-middle sm:max-w-[1600px] sm:w-[98vw] animate-slide-up max-h-[94vh] overflow-y-auto">
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-secondary-900">
                        {formatRequestNumber(selectedTicket.ticket_number)}
                      </h3>
                      <p className="text-sm text-secondary-600 mt-1">{selectedTicket.subject}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setShowClientCancellationModal(false);
                      }}
                      className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {(() => {
                    const cancellationRequest = getCancellationRequest(selectedTicket);
                    const cancellationPending = cancellationRequest?.status === 'pending';
                    const cancellationRejected = cancellationRequest?.status === 'rejected';

                    if (isClientUser) {
                      if (cancellationPending) {
                        return (
                          <div className="mb-6 rounded-lg border border-warning bg-warning-light/20 px-4 py-3">
                            <p className="text-sm font-semibold text-warning-dark">Cancellation request submitted</p>
                            <p className="text-xs text-warning-dark mt-1">
                              Your cancellation request has been submitted.
                            </p>
                          </div>
                        );
                      }

                      if (cancellationRejected) {
                        return (
                          <div className="mb-6 rounded-lg border border-danger bg-danger-light/20 px-4 py-3">
                            <p className="text-sm font-semibold text-danger-dark">Cancellation not approved</p>
                            <p className="text-xs text-danger-dark mt-1">
                              {cancellationRequest?.decision_reason || 'Your admin asked to keep this ticket open.'}
                            </p>
                          </div>
                        );
                      }
                    }

                    return null;
                  })()}

                  {detailActionFeedback && (
                    <div
                      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                        detailActionFeedback.type === 'error'
                          ? 'border-danger bg-danger-light/20 text-danger-dark'
                          : 'border-success bg-success-light/20 text-success-dark'
                      }`}
                    >
                      {detailActionFeedback.message}
                    </div>
                  )}

                  {detailLoading ? (
                    <div className="py-10 text-center text-secondary-600">Loading ticket details...</div>
                  ) : (
                    <>
                      <div className={isClientUser ? '' : 'grid grid-cols-1 lg:grid-cols-12 gap-8'}>
                      <div className={isClientUser ? '' : 'lg:col-span-4 pr-0 lg:pr-3'}>
                      <div className={isClientUser ? '' : 'rounded-xl border border-secondary-200 bg-white max-h-[74vh] overflow-hidden'}>
                      {!isClientUser && (
                        <div className="sticky top-0 z-10 border-b border-secondary-200 bg-white/95 px-4 py-3 backdrop-blur">
                          <h4 className="text-sm font-semibold text-secondary-900">Ticket Summary</h4>
                          <p className="mt-0.5 text-xs text-secondary-500">Ticket details, status, and attachments</p>
                        </div>
                      )}
                      <div className={isClientUser ? '' : 'px-4 pt-4 pb-5 overflow-y-auto max-h-[calc(74vh-64px)]'}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">Subject</label>
                          {isClientUser ? (
                            <div className="input bg-secondary-50 text-secondary-700">
                              {editTicketForm.subject || '-'}
                            </div>
                          ) : (
                            <input
                              type="text"
                              className="input"
                              value={editTicketForm.subject || ''}
                              onChange={(e) => setEditTicketForm((prev) => ({ ...prev, subject: e.target.value }))}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">Type</label>
                          {isClientUser ? (
                            <div className="input bg-secondary-50 text-secondary-700">
                              {TICKET_TYPE_LABELS[(editTicketForm.ticket_type || 'other') as TicketType]}
                            </div>
                          ) : (
                            <select
                              className="input"
                              value={editTicketForm.ticket_type || 'other'}
                              onChange={(e) =>
                                setEditTicketForm((prev) => ({ ...prev, ticket_type: e.target.value as TicketType }))
                              }
                            >
                              {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {!isClientUser && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-secondary-700 mb-2">Status</label>
                              <select
                                className="input"
                                value={editTicketForm.status || selectedTicket.status}
                                onChange={(e) =>
                                  setEditTicketForm((prev) => ({ ...prev, status: e.target.value as TicketStatus }))
                                }
                              >
                                {TICKET_STATUS_OPTIONS.map((value) => (
                                  <option key={value} value={value}>
                                    {TICKET_STATUS_LABELS[value]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-secondary-700 mb-2">Priority</label>
                              <select
                                className="input"
                                value={editTicketForm.priority || selectedTicket.priority}
                                onChange={(e) =>
                                  setEditTicketForm((prev) => ({ ...prev, priority: e.target.value as TicketPriority }))
                                }
                              >
                                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Description</label>
                        {isClientUser ? (
                          <div className="input min-h-[112px] bg-secondary-50 text-secondary-700 whitespace-pre-wrap">
                            {editTicketForm.description || '-'}
                          </div>
                        ) : (
                          <textarea
                            className="input"
                            rows={4}
                            value={editTicketForm.description || ''}
                            onChange={(e) => setEditTicketForm((prev) => ({ ...prev, description: e.target.value }))}
                          />
                        )}
                      </div>

                      {!isClientUser && (
                        <div className="mb-6 flex justify-end">
                          <button
                            type="button"
                            onClick={handleSaveTicket}
                            disabled={savingTicket}
                            className="btn-primary"
                          >
                            {savingTicket ? 'Saving...' : 'Save Ticket Changes'}
                          </button>
                        </div>
                      )}

                      {(() => {
                        const cancellationRequest = getCancellationRequest(selectedTicket);
                        const cancellationPending = cancellationRequest?.status === 'pending';

                        if (isClientUser) {
                          return null;
                        }

                        if (!cancellationPending) {
                          return null;
                        }

                        return (
                          <div className="mb-6 rounded-lg border border-warning bg-warning-light/20 p-4">
                            <h4 className="text-sm font-semibold text-warning-dark mb-2">Pending Cancellation Request</h4>
                            <p className="text-sm text-warning-dark mb-3">
                              <strong>Client reason:</strong> {cancellationRequest?.reason || 'No reason provided.'}
                            </p>
                            {!showRejectCancellation ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={handleApproveCancellation}
                                  disabled={resolvingCancellation}
                                  className="btn-primary"
                                >
                                  {resolvingCancellation ? 'Working...' : 'Approve Cancellation'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowRejectCancellation(true)}
                                  disabled={resolvingCancellation}
                                  className="btn-secondary"
                                >
                                  Reject Cancellation
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <textarea
                                  className="input"
                                  rows={3}
                                  placeholder="Reason for rejecting cancellation..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={handleRejectCancellation}
                                    disabled={resolvingCancellation || !rejectionReason.trim()}
                                    className="btn-secondary"
                                  >
                                    {resolvingCancellation ? 'Working...' : 'Submit Rejection'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowRejectCancellation(false);
                                      setRejectionReason('');
                                    }}
                                    disabled={resolvingCancellation}
                                    className="btn-secondary"
                                  >
                                    Back
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {!isClientUser && (
                      <div className="border-t border-secondary-200 pt-6 mb-6">
                        <h4 className="text-sm font-semibold text-secondary-700 mb-3">Attachments</h4>
                        {ticketAttachments.length === 0 ? (
                          <p className="text-sm text-secondary-500 mb-3">No attachments yet.</p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {ticketAttachments.map((file) => (
                              <div key={file.id} className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700">
                                {file.file_name}
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="btn-secondary cursor-pointer">
                          {uploadingAttachments ? 'Uploading...' : 'Upload Photo/PDF'}
                          <input
                            type="file"
                            className="hidden"
                            multiple
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                handleUploadAttachmentsToTicket(files);
                              }
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </div>
                      )}

                      </div>
                      </div>
                      </div>
                      <div className={isClientUser ? '' : 'lg:col-span-8 lg:border-l lg:border-secondary-200 lg:pl-5'}>
                      <div
                        className={
                          isClientUser
                            ? 'mt-6 rounded-xl border border-secondary-200 bg-secondary-50/40 p-4'
                            : `rounded-xl border bg-secondary-50/40 p-5 max-h-[74vh] overflow-hidden flex flex-col ${
                                isDraggingCorrespondence ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-200'
                              }`
                        }
                        onDragOver={handleCorrespondenceDragOver}
                        onDragEnter={handleCorrespondenceDragOver}
                        onDragLeave={handleCorrespondenceDragLeave}
                        onDrop={handleCorrespondenceDrop}
                      >
                        <h4 className="text-sm font-semibold text-secondary-700 mb-3">
                          {isClientUser ? 'Client Correspondence' : 'Correspondence'}
                        </h4>
                        <div className="space-y-3">
                          {!isClientUser && isAdminUser && (
                            <div className="rounded-lg border border-dashed border-secondary-300 bg-white px-3 py-2 text-xs text-secondary-600">
                              Drag and drop an email/message file here. It will populate the draft; click Send Message to save it as correspondence.
                            </div>
                          )}
                          {pendingCorrespondenceFile && (
                            <div className="flex items-center justify-between rounded-md border border-primary-300 bg-primary-50 px-3 py-2 text-xs text-primary-800">
                              <span>Pending file: {pendingCorrespondenceFile.name}</span>
                              <button
                                type="button"
                                className="btn-secondary py-1 text-xs"
                                onClick={() => setPendingCorrespondenceFile(null)}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {!isClientUser && (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-secondary-700">Send To</label>
                                <select
                                  className="input py-2 text-sm"
                                  value={adminRecipientType}
                                  onChange={(e) => {
                                    const nextType = e.target.value as 'client' | 'vendor' | 'other';
                                    setAdminRecipientType(nextType);
                                    if (nextType === 'client') {
                                      setAdminRecipientEmail(getDefaultClientEmail(selectedTicket));
                                    }
                                  }}
                                >
                                  <option value="client">Client</option>
                                  <option value="vendor">Vendor</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-secondary-700">
                                  Recipient Email
                                </label>
                                <input
                                  type="email"
                                  className="input py-2 text-sm"
                                  placeholder={
                                    adminRecipientType === 'client'
                                      ? 'Auto from client profile (editable)'
                                      : 'recipient@example.com'
                                  }
                                  value={adminRecipientEmail}
                                  onChange={(e) => setAdminRecipientEmail(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-secondary-700">Email Subject</label>
                                <input
                                  type="text"
                                  className="input py-2 text-sm"
                                  placeholder="Subject"
                                  value={adminEmailSubject}
                                  onChange={(e) => setAdminEmailSubject(e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                          <textarea
                            className="input"
                            rows={3}
                            placeholder="Write a new correspondence update..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSendMessage}
                              disabled={sendingMessage || (!newMessage.trim() && !pendingCorrespondenceFile)}
                              className="btn-primary"
                            >
                              {sendingMessage ? 'Saving...' : 'Send Message'}
                            </button>
                            <label className="btn-secondary cursor-pointer">
                              {uploadingMessageFile ? 'Uploading...' : 'Upload Email/Message File'}
                              <input
                                type="file"
                                className="hidden"
                                multiple
                                accept=".eml,.msg,.txt,.pdf"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    handleUploadCorrespondenceFiles(files);
                                  }
                                  e.currentTarget.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 mt-5 border-t border-secondary-200 pt-4">
                          {ticketMessages.length === 0 ? (
                            <p className="text-sm text-secondary-500">No correspondence yet.</p>
                          ) : (
                            [...ticketMessages]
                              .sort((a, b) => {
                                const tA = new Date(a.created_at).getTime();
                                const tB = new Date(b.created_at).getTime();
                                if (tA === tB) {
                                  return b.id.localeCompare(a.id);
                                }
                                return tB - tA;
                              })
                              .map((msg) => (
                                <div key={msg.id} className="rounded-lg border border-secondary-200 p-3 bg-white">
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-secondary-500">
                                      {(msg.first_name || msg.last_name)
                                        ? `${msg.first_name || ''} ${msg.last_name || ''}`.trim()
                                        : msg.is_auto_generated
                                        ? 'System'
                                        : 'User'}{' '}
                                      | {new Date(msg.created_at).toLocaleString()}
                                    </p>
                                    {!isClientUser && (
                                      <div className="flex items-center gap-2">
                                        {msg.is_origin_message ? (
                                          <span className="badge border bg-primary-100 text-primary-800 border-primary-300">
                                            Ticket Request
                                          </span>
                                        ) : (
                                          <>
                                            <select
                                              className="input py-1.5 text-xs min-w-[210px]"
                                              value={msg.status_tag || ''}
                                              onChange={(e) =>
                                                handleUpdateMessageStatusTag(
                                                  msg.id,
                                                  (e.target.value || null) as Exclude<TicketStatus, 'cancelled'> | null
                                                )
                                              }
                                              disabled={updatingMessageStatusId === msg.id}
                                            >
                                              <option value="">No Message Tag</option>
                                              {TICKET_STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>
                                                  {TICKET_STATUS_LABELS[status]}
                                                </option>
                                              ))}
                                            </select>
                                            {msg.status_tag && (
                                              <span className={`badge border ${getStatusBadgeColor(msg.status_tag as TicketStatus)}`}>
                                                {TICKET_STATUS_LABELS[msg.status_tag as TicketStatus]}
                                              </span>
                                            )}
                                          </>
                                        )}
                                        {isAdminUser && !msg.is_origin_message && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            disabled={deletingMessageId === msg.id}
                                            className="btn-secondary py-1.5 text-xs text-danger border-danger hover:bg-danger-light/20"
                                          >
                                            {deletingMessageId === msg.id ? 'Deleting...' : 'Delete'}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {!isClientUser && (msg.email_from || msg.email_to || msg.email_subject || msg.source_file_name) && (
                                    <div className="mb-2 rounded-md border border-secondary-200 bg-secondary-50 px-2.5 py-2">
                                      {msg.email_subject && (
                                        <p className="text-xs font-medium text-secondary-700">
                                          Subject: {msg.email_subject}
                                        </p>
                                      )}
                                      {(msg.email_from || msg.email_to) && (
                                        <p className="text-xs text-secondary-600">
                                          {msg.email_from ? `From: ${msg.email_from}` : ''}
                                          {msg.email_from && msg.email_to ? ' | ' : ''}
                                          {msg.email_to ? `To: ${msg.email_to}` : ''}
                                        </p>
                                      )}
                                      {msg.source_file_name && (
                                        <div className="mt-1 flex items-center gap-2">
                                          <p className="text-xs text-secondary-600">Attachment: {msg.source_file_name}</p>
                                          <button
                                            type="button"
                                            className="text-xs font-medium text-primary-700 hover:text-primary-900 underline"
                                            onClick={() => handleDownloadMessageFile(msg.id)}
                                            disabled={downloadingMessageFileId === msg.id}
                                          >
                                            {downloadingMessageFileId === msg.id ? 'Downloading...' : 'Download Email'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {isClientUser && msg.source_file_name && (
                                    <div className="mb-2 mt-1 flex items-center gap-2 rounded-md border border-secondary-200 bg-secondary-50 px-2.5 py-2">
                                      <p className="text-xs text-secondary-600">Attachment: {msg.source_file_name}</p>
                                      <button
                                        type="button"
                                        className="text-xs font-medium text-primary-700 hover:text-primary-900 underline"
                                        onClick={() => handleDownloadMessageFile(msg.id)}
                                        disabled={downloadingMessageFileId === msg.id}
                                      >
                                        {downloadingMessageFileId === msg.id ? 'Downloading...' : 'Download Email'}
                                      </button>
                                    </div>
                                  )}
                                  <p className="text-sm text-secondary-700 whitespace-pre-wrap">{msg.message}</p>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {isClientUser && (
                        <div className="mt-6 rounded-xl border border-secondary-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-secondary-700 mb-3">Attachments</h4>
                          {ticketAttachments.length === 0 ? (
                            <p className="text-sm text-secondary-500 mb-3">No attachments yet.</p>
                          ) : (
                            <div className="space-y-2 mb-3">
                              {ticketAttachments.map((file) => (
                                <div key={file.id} className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700">
                                  {file.file_name}
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="btn-secondary cursor-pointer">
                            {uploadingAttachments ? 'Uploading...' : 'Upload Photo/PDF'}
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  handleUploadAttachmentsToTicket(files);
                                }
                                e.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                      )}

                      {isClientUser && !detailLoading && (() => {
                        const cancellationRequest = getCancellationRequest(selectedTicket);
                        const cancellationPending = cancellationRequest?.status === 'pending';
                        if (selectedTicket.status === 'cancelled' || cancellationPending) {
                          return null;
                        }
                        return (
                          <div className="mt-6 border-t border-secondary-200 pt-5">
                            <button
                              type="button"
                              className="btn-secondary border-danger text-danger hover:bg-danger-light/20"
                              onClick={() => {
                                setCancellationReason('');
                                setShowClientCancellationModal(true);
                              }}
                            >
                              Cancel Request
                            </button>
                          </div>
                        );
                      })()}
                      </div>
                      </div>
                    </>
                  )}

                  {/* Status Workflow */}
                  {!isClientUser && !detailLoading && (
                  <div className="border-t border-secondary-200 pt-6">
                    <h4 className="text-sm font-semibold text-secondary-700 mb-4">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTicket.status === 'completed' || selectedTicket.status === 'cancelled') && (
                        <button
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'untouched')}
                          className="btn-secondary text-sm"
                        >
                          Reopen Ticket
                        </button>
                      )}
                      {selectedTicket.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'completed')}
                          className="btn-secondary text-sm"
                        >
                          Complete Ticket
                        </button>
                      )}
                      {selectedTicket.status !== 'cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'cancelled')}
                          className="btn-secondary text-sm"
                        >
                          Cancel Ticket
                        </button>
                      )}
                    </div>
                  </div>
                  )}

                  {isClientUser && showClientCancellationModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-secondary-900/50 px-4">
                      <div className="w-full max-w-md rounded-xl border border-secondary-200 bg-white p-5 shadow-xl">
                        <h4 className="text-base font-semibold text-secondary-900">Cancel Request</h4>
                        <p className="mt-1 text-sm text-secondary-600">
                          Please provide a reason. This request will be sent to your admin for approval.
                        </p>
                        <textarea
                          className="input mt-4"
                          rows={4}
                          placeholder="Reason for cancellation..."
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setShowClientCancellationModal(false);
                              setCancellationReason('');
                            }}
                            disabled={submittingCancellation}
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            className="btn-secondary border-danger text-danger hover:bg-danger-light/20"
                            onClick={handleRequestCancellation}
                            disabled={submittingCancellation || !cancellationReason.trim()}
                          >
                            {submittingCancellation ? 'Submitting...' : 'Submit Cancellation Request'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
