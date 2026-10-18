import { z } from 'zod';
import { getCrabappleConfig } from '../config/crabapple.js';

/**
 * Discovery configuration - how to get OAuth endpoints
 */
const DiscoverySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('issuer'),
    issuer: z.url().describe('The issuer base url. To discover the endpoints, the client will fetch the .well-known/oauth-authorization-server from this url.'),
  }),
  z.object({
    mode: z.literal('static'),
    authorizationEndpoint: z.url(),
    tokenEndpoint: z.url(),
    revocationEndpoint: z.url().optional(),
  }),
]);

/**
 * Client configuration - how to get client credentials
 */
const ClientSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('static'),
    clientId: z.string().min(1).optional(),
  }),
  z.object({
    mode: z.literal('dcr'),
    // If omitted, should be discovered from auth-server metadata as `registration_endpoint`
    registrationEndpoint: z.url().optional(),
  }),
]);

/**
 * Provider configuration schema
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ProviderConfigSchema = z.record(
  z.string(),
  z.object({
    discovery: DiscoverySchema,
    client: ClientSchema,
    scopes: z.array(z.string()).optional(),
  })
);

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProviderConfigEntry = ProviderConfig[string];

/**
 * All configured OAuth providers
 */
const providerConfigs: ProviderConfig = {
  crabapple: {
    discovery: {
      mode: 'issuer',
      issuer: "TBD",
    },
    client: {
      mode: 'dcr',
    },
    scopes: [
      "openid",
      "email",
      "profile",
    ],
  },
  google: {
    discovery: {
      mode: 'issuer',
      issuer: 'https://accounts.google.com',
    },
    client: {
      mode: 'static',
    },
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      // Per-file Drive access (non-restricted): the user grants read/write to a
      // specific doc by choosing it in the Google Picker. Enough to export/
      // download and write back, without the restricted full-drive scope.
      'https://www.googleapis.com/auth/drive.file',
    ],
  },
  'fireflies-ai': {
    discovery: {
      mode: 'issuer',
      issuer: 'https://api.fireflies.ai/.well-known/oauth-authorization-server',
    },
    client: {
      mode: 'dcr',
    },
    scopes: [
      'profile',
      'email',
    ]
  }
};

/**
 * Get provider configuration by name
 */
export async function getProviderConfig(providerName: string): Promise<ProviderConfigEntry> {
  const config = providerConfigs[providerName];
  if (!config) {
    throw new Error(`Unknown OAuth provider: ${providerName}`);
  }
  if (providerName === 'crabapple') {
    const crabappleConfig = await getCrabappleConfig();
    config.discovery = {
      mode: 'issuer',
      issuer: `${crabappleConfig.supabaseUrl}/auth/v1/.well-known/oauth-authorization-server`,
    }
  }
  return config;
}

/**
 * Get list of all configured OAuth providers
 */
export function getAvailableProviders(): string[] {
  // xuechong 2026-08-08 crabapple-bot 本地化改造-去除官网登录
  // 本地模式不提供 Crabapple Bot 官网账号登录入口，只保留 Google/Fireflies 等外部连接
  return Object.keys(providerConfigs).filter((provider) => provider !== 'crabapple');
}
