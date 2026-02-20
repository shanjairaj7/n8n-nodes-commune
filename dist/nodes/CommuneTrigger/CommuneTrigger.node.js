"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommuneTrigger = void 0;
const BASE_URL = 'https://api.commune.email/v1';
class CommuneTrigger {
    constructor() {
        this.description = {
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
                    description: 'The domain ID that owns the inbox. Find this in your Commune dashboard under Domains.',
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
                            description: 'Return the key email fields (subject, body, sender, thread ID, extracted data). Recommended.',
                        },
                        {
                            name: 'Full Payload',
                            value: 'full',
                            description: 'Return the complete raw webhook payload including raw email, security context, and attachment metadata',
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
        this.webhookMethods = {
            default: {
                async checkExists() {
                    var _a, _b;
                    const domainId = this.getNodeParameter('domainId');
                    const inboxId = this.getNodeParameter('inboxId');
                    const credentials = await this.getCredentials('communeApi');
                    const apiKey = credentials.apiKey;
                    const webhookUrl = this.getNodeWebhookUrl('default');
                    try {
                        const response = await this.helpers.httpRequest({
                            method: 'GET',
                            url: `${BASE_URL}/domains/${domainId}/inboxes/${inboxId}`,
                            headers: { Authorization: `Bearer ${apiKey}` },
                        });
                        const inbox = (_a = response === null || response === void 0 ? void 0 : response.data) !== null && _a !== void 0 ? _a : response;
                        return ((_b = inbox === null || inbox === void 0 ? void 0 : inbox.webhook) === null || _b === void 0 ? void 0 : _b.endpoint) === webhookUrl;
                    }
                    catch {
                        return false;
                    }
                },
                async create() {
                    const domainId = this.getNodeParameter('domainId');
                    const inboxId = this.getNodeParameter('inboxId');
                    const events = this.getNodeParameter('events');
                    const credentials = await this.getCredentials('communeApi');
                    const apiKey = credentials.apiKey;
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
                async delete() {
                    const domainId = this.getNodeParameter('domainId');
                    const inboxId = this.getNodeParameter('inboxId');
                    const credentials = await this.getCredentials('communeApi');
                    const apiKey = credentials.apiKey;
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
                    }
                    catch {
                        // Silently ignore — inbox may have been deleted already
                    }
                    return true;
                },
            },
        };
    }
    // ────────────────────────────────────────────────────────────────────────────
    // Called each time Commune POSTs an inbound email event
    // ────────────────────────────────────────────────────────────────────────────
    async webhook() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        const body = this.getBodyData();
        const outputMode = this.getNodeParameter('output');
        let data;
        if (outputMode === 'message') {
            // Flatten to the most useful fields for workflow builders
            const msg = (_a = body.message) !== null && _a !== void 0 ? _a : {};
            const meta = (_b = msg.metadata) !== null && _b !== void 0 ? _b : {};
            const sender = ((_c = msg.participants) !== null && _c !== void 0 ? _c : []).find((p) => p.role === 'sender');
            data = {
                // Core identifiers
                message_id: msg.message_id,
                thread_id: msg.thread_id,
                inbox_id: body.inboxId,
                inbox_address: body.inboxAddress,
                // Content
                subject: (_d = meta.subject) !== null && _d !== void 0 ? _d : '',
                body_text: (_e = msg.content) !== null && _e !== void 0 ? _e : '',
                body_html: (_f = msg.content_html) !== null && _f !== void 0 ? _f : '',
                // Sender
                from: (_g = sender === null || sender === void 0 ? void 0 : sender.identity) !== null && _g !== void 0 ? _g : '',
                // Structured extraction (top-level shortcut preferred)
                extracted_data: (_j = (_h = body.extractedData) !== null && _h !== void 0 ? _h : meta.extracted_data) !== null && _j !== void 0 ? _j : {},
                // Security
                spam_flagged: (_m = (_l = (_k = body.security) === null || _k === void 0 ? void 0 : _k.spam) === null || _l === void 0 ? void 0 : _l.flagged) !== null && _m !== void 0 ? _m : false,
                prompt_injection: (_q = (_p = (_o = body.security) === null || _o === void 0 ? void 0 : _o.prompt_injection) === null || _p === void 0 ? void 0 : _p.detected) !== null && _q !== void 0 ? _q : false,
                // Timestamps
                received_at: (_r = msg.created_at) !== null && _r !== void 0 ? _r : new Date().toISOString(),
                // Attachments
                has_attachments: ((_s = msg.attachments) !== null && _s !== void 0 ? _s : []).length > 0,
                attachment_ids: (_t = msg.attachments) !== null && _t !== void 0 ? _t : [],
            };
        }
        else {
            data = body;
        }
        return {
            workflowData: [[{ json: data }]],
        };
    }
}
exports.CommuneTrigger = CommuneTrigger;
//# sourceMappingURL=CommuneTrigger.node.js.map