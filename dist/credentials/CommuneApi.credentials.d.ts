import { ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class CommuneApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: {
        type: "generic";
        properties: {
            headers: {
                Authorization: string;
            };
        };
    };
    test: {
        request: {
            baseURL: string;
            url: string;
        };
    };
}
//# sourceMappingURL=CommuneApi.credentials.d.ts.map