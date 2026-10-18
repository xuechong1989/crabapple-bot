import { ProviderV4 } from '@ai-sdk/provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getAccessToken } from '../auth/tokens.js';
import { getCurrentUseCase } from '../analytics/use_case.js';
import { API_URL } from '../config/env.js';
import { annotateReasoningFlags } from './models-dev.js';

// Exported for transport-level verification; production passes this directly
// to the Crabapple Bot OpenRouter provider.
export const authedFetch: typeof fetch = async (input, init) => {
    const token = await getAccessToken();
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const ctx = getCurrentUseCase();
    if (ctx?.useCase) headers.set('x-crabapple-use-case', ctx.useCase);
    if (ctx?.subUseCase) headers.set('x-crabapple-sub-use-case', ctx.subUseCase);
    if (ctx?.agentName) headers.set('x-crabapple-agent-name', ctx.agentName);
    return fetch(input, { ...init, headers });
};

export function getGatewayProvider(): ProviderV4 {
    return createOpenRouter({
        baseURL: `${API_URL}/v1/llm`,
        apiKey: 'managed-by-crabapple',
        fetch: authedFetch,
    });
}

type ProviderSummary = {
    id: string;
    name: string;
    models: Array<{
        id: string;
        name?: string;
        release_date?: string;
        reasoning?: boolean;
    }>;
};

export async function listGatewayModels(): Promise<{ providers: ProviderSummary[] }> {
    const accessToken = await getAccessToken();
    const response = await fetch(`${API_URL}/v1/llm/models`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        throw new Error(`Gateway /v1/models failed: ${response.status}`);
    }
    const body = await response.json() as { data: Array<{ id: string }> };
    // The gateway returns bare "vendor/model" ids; the models.dev cache
    // supplies the reasoning capability the composer's effort control needs.
    const models = await annotateReasoningFlags(body.data.map((m) => ({ id: m.id })));
    return {
        providers: [{
            id: 'crabapple',
            name: 'Crabapple Bot',
            models,
        }],
    };
}
