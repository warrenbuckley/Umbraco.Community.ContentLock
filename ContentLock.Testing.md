# ContentLock Testing API

This document describes the testing API added to help reset content locks during E2E testing.

## Overview

To solve the issue where Playwright tests fail because content locks are not reset between test runs, we've added a test-only API endpoint that can clear all content locks from the database.

## Implementation

Two approaches have been implemented:

### Approach 1: Separate ContentLock.Testing Project (Recommended for Production)
- **Project**: `ContentLock.Testing`
- **Controller**: `ResetContentLocksController`
- **Benefits**: Complete separation, never ships with production code
- **Drawbacks**: Requires separate project management

### Approach 2: Inline Test Controller (Simpler for Development)
- **Project**: `ContentLock` (main project)
- **Controller**: `TestContentLockApiController`
- **Benefits**: Single project, uses `#if DEBUG` compiler directive
- **Drawbacks**: Code exists in main project (but not compiled in release)

## API Endpoint

**URL**: `POST /umbraco/api/test/reset-contentlocks`

**Security**:
- Only available in Development environment (`IWebHostEnvironment.IsDevelopment()`)
- Only compiled in DEBUG builds (Approach 2)
- Returns 403 Forbidden in non-development environments

**Response**:
```json
{
  "success": true,
  "message": "Successfully reset content locks - deleted 3 locks",
  "deletedCount": 3
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error resetting content locks",
  "error": "Database connection failed"
}
```

## Usage in Playwright Tests

Update your Playwright test code to call this API before each test:

```typescript
// In your test setup or beforeEach
async resetContentLocks() {
    const response = await this.post('/umbraco/api/test/reset-contentlocks');
    if (!response.ok) {
        throw new Error(`Failed to reset content locks: ${response.statusText}`);
    }
    const result = await response.json();
    console.log(`Reset content locks: ${result.message}`);
}
```

## Testing the API

You can test the API directly using curl:

```bash
# Test the endpoint (should work in development)
curl -X POST https://localhost:5001/umbraco/api/test/reset-contentlocks

# Expected response in development:
# {"success":true,"message":"Successfully reset content locks - deleted X locks","deletedCount":X}

# Expected response in production:
# 403 Forbidden
```

## Database Operation

The API performs a direct SQL DELETE operation:
```sql
DELETE FROM ContentLocks
```

This removes all records from the ContentLocks table, effectively unlocking all content nodes.

## Logging

All operations are logged:
- Successful deletions: `INFO` level with count
- Security violations: `WARN` level
- Errors: `ERROR` level with exception details

## Security Considerations

1. **Environment Check**: Only works in Development environment
2. **Build Configuration**: Approach 2 only compiles in DEBUG builds
3. **Logging**: All attempts are logged for audit purposes
4. **Error Handling**: Graceful failure without exposing internal details

This approach ensures that test APIs never accidentally make it to production while providing the necessary functionality for E2E testing.