import { createAccountMeta } from '@/connectors/base/BaseTaskProviderConnector';
import type { ITaskProviderApi, ProviderPlugin } from '@/types/api';
import type { ProviderAccount } from '@/types/domain';
import { TrelloRestConnector } from './TrelloRestConnector';

const TRELLO_LABEL_PALETTE = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
] as const;

function validateTrelloToken(tokenValue: string): string | null {
  const token = tokenValue.trim();
  if (/^[0-9a-f]{64}$/i.test(token)) {
    return 'This looks like your 64-character API Secret, not your API Token. Please generate a user Token via Step 3 ("Authorize & Get Token in Trello") — a valid Token starts with "ATTA...".';
  }
  return null;
}

export const trelloProviderPlugin: ProviderPlugin = {
  descriptor: {
    id: 'trello',
    name: 'Trello',
    tagline: 'Trello REST API v1 (Power-Up API Key + OAuth Token)',
    badgeColor: '#0079bf',
    docsUrl: 'https://trello.com/apps/admin',
    docsLabel: 'Open Trello App Admin',
    authHelperLabel: 'Authorize & Get Token in Trello',
    labelColors: TRELLO_LABEL_PALETTE,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'e.g. a1b2c3d4e5f6... (32 characters)',
        hint: 'Found inside your app on trello.com/apps/admin → Trello Auth (or API Key) tab.',
        required: true,
        monospace: true,
      },
      {
        key: 'token',
        label: 'API Token',
        type: 'password',
        placeholder: 'Starts with ATTA... (NOT the 64-char Secret)',
        hint: 'Generated on Trello after clicking "Allow" in Step 3. Do not paste the 64-char API Secret here.',
        required: true,
        monospace: true,
      },
      {
        key: 'workspace',
        label: 'Workspace / Organization (Optional)',
        type: 'text',
        placeholder: 'e.g. test or Gospodarstwo Rolne Michał Wąsowski',
        hint: 'Matches your Trello Workspace name. If left blank, your Account Name is used automatically.',
        required: false,
      },
    ],
    getAuthHelperUrl(credentials: Record<string, string>): string | null {
      const apiKey = credentials.apiKey?.trim();
      if (!apiKey) return null;
      return `https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&name=WorkspaceHub&key=${encodeURIComponent(apiKey)}`;
    },
    validateCredentials(credentials: Record<string, string>): string | null {
      return validateTrelloToken(credentials.token || '');
    },
    validateField(key: string, value: string): string | null {
      if (key === 'token') return validateTrelloToken(value);
      return null;
    },
    setupSteps: [
      {
        title: 'Create a personal app in Trello',
        description:
          'Open Trello App Admin (log in if prompted) and click the "New" button in the top-right corner.',
        details: [
          'Name: enter anything you like, e.g. "Workspace Hub".',
          'Workspace: choose any Trello workspace you have.',
          'Iframe connector URL: leave this blank (not needed).',
          'Email & Support contact: enter your email, then click "Create".',
        ],
        actionLabel: 'Open Trello App Admin',
        actionUrl: 'https://trello.com/apps/admin',
      },
      {
        title: 'Open your app & copy the API Key',
        description:
          'Open the app you just created, go to "API Key" (or "Trello Auth") in the left menu, and copy the 32-character API Key.',
        details: [
          'Paste that 32-character API Key into the "API Key" box on the right.',
          'Important: Do NOT copy the 64-character "Secret" below it — Workspace Hub needs a user Token in Step 3 instead.',
        ],
        tip: 'Already have an app in trello.com/apps/admin? Open it and copy its existing API Key.',
        completedWhenFieldFilled: 'apiKey',
      },
      {
        title: 'Authorize & copy your API Token (starts with ATTA...)',
        description:
          'After pasting your API Key, click the blue button below (or click the hyperlinked "Token" word next to your API Key in Trello).',
        details: [
          'On Trello’s permission screen, scroll down and click the green "Allow" button.',
          'Trello will display a token starting with "ATTA...". Copy that entire token and paste it into "API Token".',
        ],
        usesAuthHelper: true,
        actionLabel: 'Authorize & Get Token in Trello',
        authHelperDisabledHint:
          'First paste your 32-char API Key in the form — this button will activate immediately.',
        completedWhenFieldFilled: 'token',
      },
      {
        title: 'Name this workspace & connect',
        description:
          'Give the workspace a clear name (like "Work" or "Personal") and color badge, then click "Verify & Connect Trello".',
      },
    ],
    capabilities: {
      canCreateTask: true,
      canEditTask: true,
      canArchiveTask: true,
      canDeleteTask: true,
      canToggleComplete: true,
      canToggleSubtasks: true,
      canMoveBetweenLists: true,
      canManageLabels: true,
      canCreateLabels: true,
      canAssignMembers: true,
      canManageAttachments: true,
      canComment: true,
    },
  },

  createConnector(account: ProviderAccount): ITaskProviderApi {
    const apiKey = account.credentials.apiKey || '';
    const token = account.credentials.token || '';
    return new TrelloRestConnector(
      apiKey,
      token,
      createAccountMeta(account),
      undefined,
      account.credentials,
    );
  },
};
