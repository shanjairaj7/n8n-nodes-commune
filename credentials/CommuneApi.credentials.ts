import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CommuneApi implements ICredentialType {
	name = 'communeApi';
	displayName = 'Commune API';
	documentationUrl = 'https://docs.commune.email/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Your Commune API key. Find it in your dashboard under Settings → API Keys.',
			placeholder: 'comm_...',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.commune.email',
			url: '/v1/inboxes',
		},
	};
}
