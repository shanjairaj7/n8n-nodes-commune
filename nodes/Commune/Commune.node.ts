import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

const BASE_URL = 'https://api.commune.email/v1';

export class Commune implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Commune',
		name: 'commune',
		icon: 'file:commune.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Send and receive emails, manage inboxes, and search conversations with Commune',
		defaults: { name: 'Commune' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'communeApi', required: true }],
		properties: [
			// ────────────────────────────────────────────────────────────────────
			// RESOURCE selector
			// ────────────────────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Inbox',    value: 'inbox'    },
					{ name: 'Message',  value: 'message'  },
					{ name: 'Thread',   value: 'thread'   },
					{ name: 'Search',   value: 'search'   },
					{ name: 'Delivery', value: 'delivery' },
				],
				default: 'message',
			},

			// ────────────────────────────────────────────────────────────────────
			// MESSAGE operations
			// ────────────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send an email from a Commune inbox',
						action: 'Send an email',
					},
					{
						name: 'List',
						value: 'list',
						description: 'List messages in an inbox or thread',
						action: 'List messages',
					},
				],
				default: 'send',
			},

			// Send email fields
			{
				displayName: 'From Inbox',
				name: 'inboxId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getInboxes' },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'The inbox to send this email from',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'Recipient email address. Separate multiple addresses with commas.',
				placeholder: 'e.g. customer@example.com',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'Email subject line',
				placeholder: 'e.g. Your order has shipped',
			},
			{
				displayName: 'Email Body (HTML)',
				name: 'html',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'HTML email body. Provide either this or Plain Text Body (or both).',
				placeholder: 'e.g. <p>Hello!</p>',
			},
			{
				displayName: 'Plain Text Body',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'Plain text fallback. Recommended alongside the HTML body.',
			},
			{
				displayName: 'Additional Options',
				name: 'sendOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				options: [
					{
						displayName: 'Thread ID',
						name: 'thread_id',
						type: 'string',
						default: '',
						description: 'Reply within an existing conversation thread',
					},
					{
						displayName: 'CC',
						name: 'cc',
						type: 'string',
						default: '',
						description: 'CC addresses (comma-separated)',
						placeholder: 'e.g. cc@example.com',
					},
					{
						displayName: 'BCC',
						name: 'bcc',
						type: 'string',
						default: '',
						description: 'BCC addresses (comma-separated)',
						placeholder: 'e.g. bcc@example.com',
					},
					{
						displayName: 'Reply-To',
						name: 'reply_to',
						type: 'string',
						default: '',
						description: 'Override the reply-to address',
						placeholder: 'e.g. noreply@example.com',
					},
					{
						displayName: 'From Name',
						name: 'from',
						type: 'string',
						default: '',
						description: 'Custom sender display name',
						placeholder: 'e.g. Acme Support',
					},
				],
			},

			// List messages fields
			{
				displayName: 'Inbox ID',
				name: 'inboxId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['list'] } },
				description: 'Filter messages by inbox (leave blank for all)',
			},

			// ────────────────────────────────────────────────────────────────────
			// INBOX operations
			// ────────────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['inbox'] } },
				options: [
					{ name: 'Create',                value: 'create',     action: 'Create an inbox'                       },
					{ name: 'List',                  value: 'list',       action: 'List all inboxes'                      },
					{ name: 'Get',                   value: 'get',        action: 'Get inbox details'                     },
					{ name: 'Update',                value: 'update',     action: 'Update an inbox'                       },
					{ name: 'Delete',                value: 'delete',     action: 'Delete an inbox'                       },
					{ name: 'Set Webhook',           value: 'setWebhook', action: 'Set the webhook on an inbox'           },
					{ name: 'Set Extraction Schema', value: 'setSchema',  action: 'Configure structured data extraction'  },
				],
				default: 'list',
			},

			// Create inbox
			{
				displayName: 'Local Part',
				name: 'localPart',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['inbox'], operation: ['create'] } },
				description: 'The part before @ in the email address (e.g. "support" → support@yourdomain.com)',
				placeholder: 'e.g. support',
			},
			{
				displayName: 'Inbox Options',
				name: 'inboxCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['inbox'], operation: ['create'] } },
				options: [
					{
						displayName: 'Domain ID',
						name: 'domainId',
						type: 'string',
						default: '',
						description: 'The domain to create the inbox on. Auto-resolved if left blank.',
					},
					{
						displayName: 'Display Name',
						name: 'displayName',
						type: 'string',
						default: '',
						description: 'Sender name shown in email clients (e.g. "Acme Support")',
						placeholder: 'e.g. Acme Support',
					},
					{
						displayName: 'Agent Name',
						name: 'agentName',
						type: 'string',
						default: '',
						description: 'Internal name for this agent inbox',
						placeholder: 'e.g. support-bot',
					},
					{
						displayName: 'Webhook URL',
						name: 'webhookEndpoint',
						type: 'string',
						default: '',
						description: 'URL to notify when emails arrive. Use the Commune Trigger node for n8n-native webhook handling.',
						placeholder: 'e.g. https://your-server.com/webhook',
					},
				],
			},

			// Shared domainId + inboxId for get / update / delete / setWebhook / setSchema
			{
				displayName: 'Domain ID',
				name: 'domainId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['inbox'],
						operation: ['get', 'update', 'delete', 'setWebhook', 'setSchema'],
					},
				},
				description: 'The ID of the domain the inbox belongs to',
				placeholder: 'e.g. d_abc123',
			},
			{
				displayName: 'Inbox ID',
				name: 'inboxId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['inbox'],
						operation: ['get', 'update', 'delete', 'setWebhook', 'setSchema'],
					},
				},
				description: 'The ID of the inbox to act on',
				placeholder: 'e.g. inbox_xyz',
			},

			// Update inbox options
			{
				displayName: 'Update Fields',
				name: 'inboxUpdateOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['inbox'], operation: ['update'] } },
				options: [
					{
						displayName: 'Display Name',
						name: 'displayName',
						type: 'string',
						default: '',
						description: 'Sender name shown in email clients',
						placeholder: 'e.g. Acme Support',
					},
					{
						displayName: 'Agent Name',
						name: 'agentName',
						type: 'string',
						default: '',
						description: 'Internal name for this agent inbox',
						placeholder: 'e.g. support-bot',
					},
				],
			},

			// Set Webhook
			{
				displayName: 'Webhook Endpoint',
				name: 'webhookEndpoint',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['inbox'], operation: ['setWebhook'] } },
				description: 'The URL that Commune will POST inbound email events to',
				placeholder: 'e.g. https://your-server.com/webhook/email',
			},

			// Set Extraction Schema
			{
				displayName: 'Schema JSON',
				name: 'schemaJson',
				type: 'json',
				required: true,
				default: '{"type":"object","properties":{"intent":{"type":"string"},"summary":{"type":"string"}}}',
				displayOptions: { show: { resource: ['inbox'], operation: ['setSchema'] } },
				description: 'A JSON Schema object defining what to extract from inbound emails',
			},
			{
				displayName: 'Schema Name',
				name: 'schemaName',
				type: 'string',
				default: 'extraction',
				displayOptions: { show: { resource: ['inbox'], operation: ['setSchema'] } },
				description: 'Name for this extraction schema',
			},

			// ────────────────────────────────────────────────────────────────────
			// THREAD operations
			// ────────────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['thread'] } },
				options: [
					{ name: 'List',          value: 'list',         action: 'List threads in an inbox'      },
					{ name: 'Get Messages',  value: 'getMessages',  action: 'Get messages in a thread'      },
					{ name: 'Update Status', value: 'updateStatus', action: 'Update the status of a thread' },
				],
				default: 'list',
			},
			{
				displayName: 'Inbox ID',
				name: 'inboxId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['thread'], operation: ['list'] } },
				description: 'Filter threads by inbox ID',
			},
			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['thread'], operation: ['getMessages', 'updateStatus'] } },
				description: 'The thread to read or update',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Open',        value: 'open'        },
					{ name: 'Needs Reply', value: 'needs_reply' },
					{ name: 'Waiting',     value: 'waiting'     },
					{ name: 'Closed',      value: 'closed'      },
				],
				default: 'open',
				displayOptions: { show: { resource: ['thread'], operation: ['updateStatus'] } },
				description: 'New status to set on the thread',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 20,
				displayOptions: { show: { resource: ['thread'], operation: ['list'] } },
				description: 'Maximum number of threads to return (1–100)',
			},

			// ────────────────────────────────────────────────────────────────────
			// SEARCH operations
			// ────────────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['search'] } },
				options: [
					{
						name: 'Search Threads',
						value: 'searchThreads',
						description: 'Semantic or keyword search across email threads',
						action: 'Search threads',
					},
				],
				default: 'searchThreads',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['search'] } },
				description: 'What to search for. Commune uses semantic (vector) search when available.',
				placeholder: 'e.g. angry customer about refund',
			},
			{
				displayName: 'Inbox ID',
				name: 'inboxId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['search'] } },
				description: 'Narrow results to a specific inbox (recommended)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 10,
				displayOptions: { show: { resource: ['search'] } },
				description: 'Maximum number of results (1–100)',
			},

			// ────────────────────────────────────────────────────────────────────
			// DELIVERY operations
			// ────────────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['delivery'] } },
				options: [
					{
						name: 'Get Metrics',
						value: 'getMetrics',
						description: 'Get delivery, bounce, and complaint rates for an inbox',
						action: 'Get delivery metrics',
					},
				],
				default: 'getMetrics',
			},
			{
				displayName: 'Inbox ID',
				name: 'inboxId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['delivery'] } },
				description: 'The inbox to fetch metrics for',
			},
			{
				displayName: 'Period',
				name: 'period',
				type: 'options',
				options: [
					{ name: 'Last 24 Hours', value: '24h' },
					{ name: 'Last 7 Days',   value: '7d'  },
					{ name: 'Last 30 Days',  value: '30d' },
				],
				default: '7d',
				displayOptions: { show: { resource: ['delivery'] } },
				description: 'Time range for the metrics',
			},
		],
	};

	methods = {
		loadOptions: {
			async getInboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('communeApi');
				const apiKey = credentials.apiKey as string;
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: 'https://api.commune.email/v1/inboxes',
					headers: { Authorization: `Bearer ${apiKey}` },
				});
				const inboxes = (response as any)?.data ?? response;
				return (Array.isArray(inboxes) ? inboxes : []).map((inbox: any) => ({
					name: inbox.address || `${inbox.localPart}@${inbox.domain_name}` || inbox.id,
					value: inbox.id,
					description: inbox.displayName || inbox.localPart || '',
				}));
			},
		},
	};

	// ──────────────────────────────────────────────────────────────────────────
	// EXECUTE
	// ──────────────────────────────────────────────────────────────────────────
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('communeApi');
		const apiKey = credentials.apiKey as string;

		const authHeader = { Authorization: `Bearer ${apiKey}` };
		const jsonHeader = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

		for (let i = 0; i < items.length; i++) {
			try {
				const resource  = this.getNodeParameter('resource',  i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let response: any;

				// ── MESSAGE ──────────────────────────────────────────────────────
				if (resource === 'message' && operation === 'send') {
					const to      = this.getNodeParameter('to',      i) as string;
					const subject = this.getNodeParameter('subject', i) as string;
					const html    = this.getNodeParameter('html',    i) as string;
					const text    = this.getNodeParameter('text',    i) as string;
					const opts    = this.getNodeParameter('sendOptions', i, {}) as any;

					if (!html && !text) {
						throw new NodeOperationError(
							this.getNode(),
							'Provide at least an HTML body or plain text body',
							{ itemIndex: i },
						);
					}

					const sendInboxId = this.getNodeParameter('inboxId', i) as string;
					const body: any = { to: to.split(',').map((s: string) => s.trim()), subject };
					if (html)           body.html      = html;
					if (text)           body.text      = text;
					if (sendInboxId)    body.inboxId   = sendInboxId;
					if (opts.thread_id) body.thread_id = opts.thread_id;
					if (opts.cc)        body.cc        = opts.cc.split(',').map((s: string) => s.trim());
					if (opts.bcc)       body.bcc       = opts.bcc.split(',').map((s: string) => s.trim());
					if (opts.reply_to)  body.reply_to  = opts.reply_to;
					if (opts.from)      body.from      = opts.from;

					response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${BASE_URL}/messages/send`,
						headers: jsonHeader,
						body,
					});

				} else if (resource === 'message' && operation === 'list') {
					const inboxId = this.getNodeParameter('inboxId', i, '') as string;
					const url = inboxId
						? `${BASE_URL}/messages?inbox_id=${encodeURIComponent(inboxId)}`
						: `${BASE_URL}/messages`;
					response = await this.helpers.httpRequest({ method: 'GET', url, headers: authHeader });

				// ── INBOX ─────────────────────────────────────────────────────
				} else if (resource === 'inbox' && operation === 'create') {
					const localPart = this.getNodeParameter('localPart', i) as string;
					const opts      = this.getNodeParameter('inboxCreateOptions', i, {}) as any;
					const body: any = { local_part: localPart };
					if (opts.domainId)        body.domain_id    = opts.domainId;
					if (opts.displayName)     body.display_name = opts.displayName;
					if (opts.agentName)       body.name         = opts.agentName;
					if (opts.webhookEndpoint) body.webhook      = { endpoint: opts.webhookEndpoint, events: ['inbound'] };

					response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${BASE_URL}/inboxes`,
						headers: jsonHeader,
						body,
					});

				} else if (resource === 'inbox' && operation === 'list') {
					response = await this.helpers.httpRequest({ method: 'GET', url: `${BASE_URL}/inboxes`, headers: authHeader });

				} else if (resource === 'inbox' && operation === 'get') {
					const domainId = this.getNodeParameter('domainId', i) as string;
					const inboxId  = this.getNodeParameter('inboxId',  i) as string;
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
						headers: authHeader,
					});

				} else if (resource === 'inbox' && operation === 'update') {
					const domainId = this.getNodeParameter('domainId', i) as string;
					const inboxId  = this.getNodeParameter('inboxId',  i) as string;
					const opts     = this.getNodeParameter('inboxUpdateOptions', i, {}) as any;
					const body: any = {};
					if (opts.displayName) body.display_name = opts.displayName;
					if (opts.agentName)   body.name         = opts.agentName;

					if (Object.keys(body).length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							'Provide at least one field to update in \'Update Fields\'',
							{ itemIndex: i },
						);
					}

					response = await this.helpers.httpRequest({
						method: 'PUT',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
						headers: jsonHeader,
						body,
					});

				} else if (resource === 'inbox' && operation === 'delete') {
					const domainId = this.getNodeParameter('domainId', i) as string;
					const inboxId  = this.getNodeParameter('inboxId',  i) as string;
					await this.helpers.httpRequest({
						method: 'DELETE',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
						headers: authHeader,
					});
					response = { deleted: true };

				} else if (resource === 'inbox' && operation === 'setWebhook') {
					const domainId = this.getNodeParameter('domainId',        i) as string;
					const inboxId  = this.getNodeParameter('inboxId',         i) as string;
					const endpoint = this.getNodeParameter('webhookEndpoint', i) as string;
					response = await this.helpers.httpRequest({
						method: 'PUT',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
						headers: jsonHeader,
						body: { webhook: { endpoint, events: ['inbound'] } },
					});

				} else if (resource === 'inbox' && operation === 'setSchema') {
					const domainId   = this.getNodeParameter('domainId',   i) as string;
					const inboxId    = this.getNodeParameter('inboxId',    i) as string;
					const schemaName = this.getNodeParameter('schemaName', i) as string;
					const schemaJson = this.getNodeParameter('schemaJson', i) as string;
					response = await this.helpers.httpRequest({
						method: 'PUT',
						url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}/extraction-schema`,
						headers: jsonHeader,
						body: {
							name: schemaName,
							enabled: true,
							schema: typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson,
						},
					});

				// ── THREAD ────────────────────────────────────────────────────
				} else if (resource === 'thread' && operation === 'list') {
					const inboxId = this.getNodeParameter('inboxId', i) as string;
					const limit   = this.getNodeParameter('limit',   i) as number;
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/threads?inbox_id=${encodeURIComponent(inboxId)}&limit=${limit}`,
						headers: authHeader,
					});

				} else if (resource === 'thread' && operation === 'getMessages') {
					const threadId = this.getNodeParameter('threadId', i) as string;
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/threads/${threadId}/messages`,
						headers: authHeader,
					});

				} else if (resource === 'thread' && operation === 'updateStatus') {
					const threadId = this.getNodeParameter('threadId', i) as string;
					const status   = this.getNodeParameter('status',   i) as string;
					response = await this.helpers.httpRequest({
						method: 'PUT',
						url: `${BASE_URL}/threads/${threadId}/status`,
						headers: jsonHeader,
						body: { status },
					});

				// ── SEARCH ────────────────────────────────────────────────────
				} else if (resource === 'search' && operation === 'searchThreads') {
					const query   = this.getNodeParameter('query',   i) as string;
					const inboxId = this.getNodeParameter('inboxId', i, '') as string;
					const limit   = this.getNodeParameter('limit',   i) as number;
					let url = `${BASE_URL}/search/threads?q=${encodeURIComponent(query)}&limit=${limit}`;
					if (inboxId) url += `&inbox_id=${encodeURIComponent(inboxId)}`;
					response = await this.helpers.httpRequest({ method: 'GET', url, headers: authHeader });

				// ── DELIVERY ──────────────────────────────────────────────────
				} else if (resource === 'delivery' && operation === 'getMetrics') {
					const inboxId = this.getNodeParameter('inboxId', i) as string;
					const period  = this.getNodeParameter('period',  i) as string;
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/delivery/metrics?inbox_id=${encodeURIComponent(inboxId)}&period=${period}`,
						headers: authHeader,
					});
				}

				// Flatten response: unwrap { data: ... } envelope if present
				const data = (response as any)?.data ?? response;

				if (Array.isArray(data)) {
					returnData.push(...data.map((d: any) => ({ json: d, pairedItem: { item: i } })));
				} else {
					returnData.push({ json: data as any, pairedItem: { item: i } });
				}

			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
