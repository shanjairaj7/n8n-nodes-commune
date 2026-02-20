import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

const BASE_URL = 'https://api.commune.email/v1';

export class CommuneTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Commune Trigger',
		name: 'communeTrigger',
		icon: 'file:commune.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when an email arrives in a Commune inbox',
		defaults: { name: 'Commune Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'communeApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'commune-inbound',
			},
		],
		properties: [
			{
				displayName: 'Domain ID',
				name: 'domainId',
				type: 'string',
				required: true,
				default: '',
				description:
					'The domain ID that owns the inbox. Find this in your Commune dashboard under Domains.',
				placeholder: 'd_abc123',
			},
			{
				displayName: 'Inbox ID',
				name: 'inboxId',
				type: 'string',
				required: true,
				default: '',
				description: 'The inbox to listen for emails on',
				placeholder: 'inbox_xyz',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Inbound Email',
						value: 'inbound',
						description: 'Trigger when an email is received',
					},
				],
				default: ['inbound'],
				description: 'Which events to listen for',
			},
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				options: [
					{
						name: 'Message Only',
						value: 'message',
						description:
							'Return the key email fields (subject, body, sender, thread ID, extracted data). Recommended.',
					},
					{
						name: 'Full Payload',
						value: 'full',
						description:
							'Return the complete raw webhook payload including raw email, security context, and attachment metadata',
					},
				],
				default: 'message',
				description: 'How much data to pass into the workflow',
			},
		],
	};

	// ────────────────────────────────────────────────────────────────────────────
	// Webhook lifecycle: register / check / deregister when workflow activates
	// ────────────────────────────────────────────────────────────────────────────
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const domainId   = this.getNodeParameter('domainId') as string;
				const inboxId    = this.getNodeParameter('inboxId') as string;
				const credentials = await this.getCredentials('communeApi');
				const apiKey     = credentials.apiKey as string;
				const webhookUrl = this.getNodeWebhookUrl('default');

				try {
					const response: any = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
						headers: { Authorization: `Bearer ${apiKey}` },
					});
					const inbox = response?.data ?? response;
					return inbox?.webhook?.endpoint === webhookUrl;
				} catch {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const domainId   = this.getNodeParameter('domainId') as string;
				const inboxId    = this.getNodeParameter('inboxId') as string;
				const events     = this.getNodeParameter('events') as string[];
				const credentials = await this.getCredentials('communeApi');
				const apiKey     = credentials.apiKey as string;
				const webhookUrl = this.getNodeWebhookUrl('default');

				await this.helpers.httpRequest({
					method: 'PUT',
					url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
					},
					body: { webhook: { endpoint: webhookUrl, events } },
				});
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const domainId   = this.getNodeParameter('domainId') as string;
				const inboxId    = this.getNodeParameter('inboxId') as string;
				const credentials = await this.getCredentials('communeApi');
				const apiKey     = credentials.apiKey as string;

				try {
					await this.helpers.httpRequest({
						method: 'PUT',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
						},
						body: { webhook: { endpoint: null } },
					});
				} catch {
					// Silently ignore — inbox may have been deleted already
				}
				return true;
			},
		},
	};

	// ────────────────────────────────────────────────────────────────────────────
	// Called each time Commune POSTs an inbound email event
	// ────────────────────────────────────────────────────────────────────────────
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body       = this.getBodyData() as any;
		const outputMode = this.getNodeParameter('output') as string;

		let data: any;

		if (outputMode === 'message') {
			// Flatten to the most useful fields for workflow builders
			const msg    = body.message ?? {};
			const meta   = msg.metadata ?? {};
			const sender = (msg.participants ?? []).find((p: any) => p.role === 'sender');

			data = {
				// Core identifiers
				message_id:    msg.message_id,
				thread_id:     msg.thread_id,
				inbox_id:      body.inboxId,
				inbox_address: body.inboxAddress,
				// Content
				subject:       meta.subject ?? '',
				body_text:     msg.content      ?? '',
				body_html:     msg.content_html  ?? '',
				// Sender
				from:          sender?.identity  ?? '',
				// Structured extraction (top-level shortcut preferred)
				extracted_data: body.extractedData ?? meta.extracted_data ?? {},
				// Security
				spam_flagged:      body.security?.spam?.flagged              ?? false,
				prompt_injection:  body.security?.prompt_injection?.detected ?? false,
				// Timestamps
				received_at: msg.created_at ?? new Date().toISOString(),
				// Attachments
				has_attachments: (msg.attachments ?? []).length > 0,
				attachment_ids:  msg.attachments ?? [],
			};
		} else {
			data = body;
		}

		return {
			workflowData: [[{ json: data }]],
		};
	}
}
