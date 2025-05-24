import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onInit } from './entrypoint';
import { client } from '../api/client.gen';
import { CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS } from '../conditions/CanShowCommonActions.Condition';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

// Mocks
vi.mock('@umbraco-cms/backoffice/auth', () => ({
  UMB_AUTH_CONTEXT: Symbol('UMB_AUTH_CONTEXT') // Mocking as a Symbol, as it's often used as a token
}));
vi.mock('@umbraco-cms/backoffice/extension-api', () => ({
  UmbEntryPointOnInit: vi.fn(), // Not directly used by onInit but good to have for context
  UmbConditionConfigBase: vi.fn()
}));
vi.mock('../api/client.gen', () => ({
  client: {
    setConfig: vi.fn()
  }
}));

describe('onInit', () => {
  let mockHost;
  let mockExtensionRegistry;
  let mockAuthContext;

  beforeEach(() => {
    // Clear mocks
    vi.mocked(client.setConfig).mockClear();
    // UMB_AUTH_CONTEXT is a symbol, so no need to clear it as a function.
    // The mock for consumeContext will handle providing the mockAuthContext.

    mockAuthContext = {
      getOpenApiConfiguration: vi.fn().mockReturnValue({
        base: 'https://test-base.com',
        credentials: 'omit',
        token: vi.fn().mockResolvedValue('test-token'),
      }),
    };

    mockHost = {
      consumeContext: vi.fn((contextAlias, callback) => {
        // Simulate the consumption of UMB_AUTH_CONTEXT
        if (contextAlias === UMB_AUTH_CONTEXT) {
          callback(mockAuthContext);
        }
      }),
    };

    mockExtensionRegistry = {
      appendCondition: vi.fn(),
    };
  });

  it('should configure the API client with auth context details', async () => {
    await onInit(mockHost, mockExtensionRegistry);

    expect(mockHost.consumeContext).toHaveBeenCalledWith(UMB_AUTH_CONTEXT, expect.any(Function));
    expect(mockAuthContext.getOpenApiConfiguration).toHaveBeenCalled();
    expect(client.setConfig).toHaveBeenCalledWith({
      baseUrl: 'https://test-base.com',
      credentials: 'omit',
      auth: expect.any(Function),
    });

    // Check if the auth function from setConfig calls the token function and returns the token
    const authFunction = vi.mocked(client.setConfig).mock.calls[0][0].auth;
    const token = await authFunction(); // Call the passed auth function
    expect(mockAuthContext.getOpenApiConfiguration().token).toHaveBeenCalled();
    expect(token).toBe('test-token'); // Ensure the token is correctly returned
  });

  it('should append conditions to the specified extensions', async () => {
    await onInit(mockHost, mockExtensionRegistry);

    const expectedExtensions = [
      'Umb.WorkspaceAction.Document.SaveAndPublish',
      'Umb.WorkspaceAction.Document.Save',
      'Umb.WorkspaceAction.Document.SaveAndPreview',
      'Umb.EntityAction.Document.Publish',
      'Umb.EntityAction.Document.Unpublish',
      'Umb.EntityAction.Document.RecycleBin.Trash',
      'Umb.EntityAction.Document.Rollback',
      'Umb.EntityAction.Document.MoveTo',
      'Umb.EntityAction.Document.Delete',
      'Umb.EntityAction.Document.DuplicateTo',
    ];

    expect(mockExtensionRegistry.appendCondition).toHaveBeenCalledTimes(expectedExtensions.length);

    const expectedCondition = {
      alias: CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS,
    };

    expectedExtensions.forEach(extensionAlias => {
      expect(mockExtensionRegistry.appendCondition).toHaveBeenCalledWith(extensionAlias, expect.objectContaining(expectedCondition));
    });
  });
});
