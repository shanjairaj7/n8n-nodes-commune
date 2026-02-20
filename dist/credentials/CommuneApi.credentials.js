"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommuneApi = void 0;
class CommuneApi {
    constructor() {
        this.name = 'communeApi';
        this.displayName = 'Commune API';
        this.documentationUrl = 'https://commune.email/docs/authentication';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                required: true,
                default: '',
                description: 'Your Commune API key. Find it in your dashboard under Settings → API Keys.',
                placeholder: 'comm_...',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://api.commune.email',
                url: '/v1/inboxes',
            },
        };
    }
}
exports.CommuneApi = CommuneApi;
//# sourceMappingURL=CommuneApi.credentials.js.map