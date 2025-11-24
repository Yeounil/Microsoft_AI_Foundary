# News Report User Association Implementation Guide

## Overview
This guide documents the implementation of user-specific news report functionality, allowing each user to create, view, and manage their own news analysis reports with proper data isolation.

## Changes Summary

### 1. Database Migration
**File**: `backend/migrations/add_user_id_to_news_reports.sql`

#### Changes:
- Added `user_id` column (UUID) to `news_reports` table
- Created foreign key constraint referencing `auth_users(id)` with CASCADE delete
- Created indexes for performance:
  - `idx_news_reports_user_id` on `user_id`
  - `idx_news_reports_user_symbol` on `(user_id, symbol)`
- Enabled Row Level Security (RLS) with 4 policies:
  - `SELECT`: Users can view their own reports
  - `INSERT`: Users can create reports with their own user_id
  - `UPDATE`: Users can update their own reports
  - `DELETE`: Users can delete their own reports

#### Migration Steps:
1. Open Supabase SQL Editor
2. Copy the entire content from `migrations/add_user_id_to_news_reports.sql`
3. Execute the SQL
4. Verify changes using the validation queries at the bottom of the file
5. Handle existing data (if any):
   - Option 1: Delete existing reports without user_id
   - Option 2: Assign existing reports to a specific user

### 2. API Modifications
**File**: `backend/app/api/news_report_v1.py`

#### New Dependencies:
```python
from app.core.auth_supabase import get_current_user
from fastapi import Depends
```

#### Modified Endpoints:

##### POST `/api/v1/news-report`
- **Change**: Now requires authentication
- **New Parameter**: `current_user: dict = Depends(get_current_user)`
- **Behavior**: Automatically associates created reports with the authenticated user
- **Returns**: Report data with `user_id` and `saved: True/False`

##### GET `/api/v1/news-report/{symbol}`
- **Change**: Now requires authentication and filters by user_id
- **New Parameter**: `current_user: dict = Depends(get_current_user)`
- **Behavior**: Only returns reports created by the authenticated user
- **Returns**: User's most recent non-expired report for the symbol

#### New Endpoints:

##### GET `/api/v1/news-report/my-reports`
- **Authentication**: Required
- **Query Parameters**:
  - `limit` (int, default: 20, max: 100): Number of reports to retrieve
  - `offset` (int, default: 0): Number of reports to skip (for pagination)
- **Returns**:
  ```json
  {
    "total_count": 50,
    "reports": [
      {
        "id": 123,
        "symbol": "AAPL",
        "analyzed_count": 20,
        "limit_used": 20,
        "created_at": "2025-01-08T16:30:00Z",
        "expires_at": "2025-01-09T16:30:00Z",
        "is_expired": false
      }
    ]
  }
  ```
- **Description**: Lists all reports created by the authenticated user, ordered by creation date (newest first). Includes both expired and non-expired reports.

##### GET `/api/v1/news-report/report/{report_id}`
- **Authentication**: Required
- **Path Parameters**:
  - `report_id` (int): The ID of the report to retrieve
- **Returns**:
  ```json
  {
    "id": 123,
    "user_id": "uuid-string",
    "symbol": "AAPL",
    "report_data": { ... },
    "analyzed_count": 20,
    "limit_used": 20,
    "created_at": "2025-01-08T16:30:00Z",
    "expires_at": "2025-01-09T16:30:00Z",
    "is_expired": false
  }
  ```
- **Description**: Retrieves a specific report by ID. Users can only access their own reports (enforced by RLS).
- **Error Cases**:
  - 404: Report not found or not owned by the user

##### GET `/api/v1/news-report/{symbol}/preview`
- **Change**: No authentication required (unchanged)
- **Description**: Previews news articles that would be used for report generation

## Security Features

### Row Level Security (RLS)
All `news_reports` queries automatically enforce user isolation:
- Users can only see their own reports
- Users cannot access, modify, or delete other users' reports
- Database-level security ensures no data leakage

### Authentication Flow
1. User logs in and receives JWT access token
2. Access token is sent in `Authorization: Bearer <token>` header
3. `get_current_user` dependency validates token and extracts user info
4. User ID is automatically used in all database queries

## API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/news-report` | Yes | Create new report for symbol |
| GET | `/api/v1/news-report/{symbol}` | Yes | Get user's latest report for symbol |
| GET | `/api/v1/news-report/my-reports` | Yes | List all user's reports |
| GET | `/api/v1/news-report/report/{report_id}` | Yes | Get specific report by ID |
| GET | `/api/v1/news-report/{symbol}/preview` | No | Preview news for report |

## Testing Guide

### 1. Database Migration Testing
```sql
-- Check user_id column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'news_reports' AND column_name = 'user_id';

-- Check foreign key constraint
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'news_reports' AND column_name = 'user_id';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'news_reports';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'news_reports';
```

### 2. API Testing

#### Test 1: Create Report (POST)
```bash
# Login first to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass"}'

# Create report
curl -X POST http://localhost:8000/api/v1/news-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"symbol": "AAPL", "limit": 20}'
```

Expected: Report created with user_id associated

#### Test 2: Get Report by Symbol (GET)
```bash
curl -X GET http://localhost:8000/api/v1/news-report/AAPL \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Expected: Returns user's latest AAPL report or 404 if none exists

#### Test 3: List All Reports (GET)
```bash
# Get first 10 reports
curl -X GET "http://localhost:8000/api/v1/news-report/my-reports?limit=10&offset=0" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Expected: List of user's reports with pagination

#### Test 4: Get Specific Report (GET)
```bash
curl -X GET http://localhost:8000/api/v1/news-report/report/123 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Expected: Specific report details or 404 if not found/not owned

#### Test 5: Unauthorized Access (Negative Test)
```bash
# Try accessing without token
curl -X GET http://localhost:8000/api/v1/news-report/AAPL

# Try accessing another user's report by ID
curl -X GET http://localhost:8000/api/v1/news-report/report/999 \
  -H "Authorization: Bearer <USER2_TOKEN>"
```

Expected: 401 Unauthorized or 404 Not Found

### 3. RLS Testing
```sql
-- Test as User A (should only see their own reports)
SET SESSION "request.jwt.claims" = '{"user_id": "USER_A_UUID"}';
SELECT * FROM news_reports;

-- Test as User B (should only see their own reports)
SET SESSION "request.jwt.claims" = '{"user_id": "USER_B_UUID"}';
SELECT * FROM news_reports;
```

## Frontend Integration

### Example: Fetch User's Reports
```javascript
// Fetch all user's reports
const fetchMyReports = async () => {
  const token = localStorage.getItem('access_token');
  const response = await fetch('http://localhost:8000/api/v1/news-report/my-reports?limit=20', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
};

// Fetch specific report
const fetchReport = async (reportId) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`http://localhost:8000/api/v1/news-report/report/${reportId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
};

// Create new report
const createReport = async (symbol, limit = 20) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch('http://localhost:8000/api/v1/news-report', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ symbol, limit })
  });
  const data = await response.json();
  return data;
};
```

## Rollback Instructions

If you need to rollback the migration:

```sql
-- Drop RLS policies
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.news_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.news_reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON public.news_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.news_reports;

-- Disable RLS
ALTER TABLE public.news_reports DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_news_reports_user_symbol;
DROP INDEX IF EXISTS idx_news_reports_user_id;

-- Drop foreign key
ALTER TABLE public.news_reports DROP CONSTRAINT IF EXISTS news_reports_user_id_fkey;

-- Drop column
ALTER TABLE public.news_reports DROP COLUMN IF EXISTS user_id;
```

## Common Issues & Solutions

### Issue 1: "null value in column user_id violates not-null constraint"
**Solution**: The migration creates user_id as nullable. If you need it to be NOT NULL, first ensure all existing reports have a user_id assigned.

### Issue 2: RLS blocking all queries
**Solution**: Ensure you're using Supabase service role key for the backend, not anon key. Service role key bypasses RLS.

### Issue 3: Users seeing each other's reports
**Solution**: Verify RLS is enabled and policies are correctly applied. Check using:
```sql
SELECT * FROM pg_policies WHERE tablename = 'news_reports';
```

## Performance Considerations

1. **Indexes**: Created on `user_id` and `(user_id, symbol)` for fast lookups
2. **Pagination**: Use `limit` and `offset` parameters in `/my-reports` endpoint
3. **Caching**: Existing 24-hour expiration logic remains unchanged
4. **Query Optimization**: All queries filter by user_id first, leveraging indexes

## Next Steps

1. **Execute the database migration** in Supabase SQL Editor
2. **Test all endpoints** using the testing guide above
3. **Update frontend** to use the new endpoints
4. **Monitor logs** for any authentication or RLS issues
5. **Consider adding**:
   - Report deletion endpoint (DELETE `/api/v1/news-report/report/{id}`)
   - Bulk report operations
   - Report sharing functionality (if needed)
   - Report export to PDF/CSV

## Additional Features to Consider

1. **Report Management**:
   - Delete report endpoint
   - Update/regenerate report endpoint
   - Mark reports as favorite

2. **Analytics**:
   - Track report view counts
   - Report generation history
   - Most analyzed symbols per user

3. **Sharing**:
   - Share report with other users
   - Public report links
   - Report templates

## Support

For issues or questions:
1. Check logs in `backend/logs/` directory
2. Verify RLS policies are active
3. Ensure JWT tokens are valid
4. Check Supabase dashboard for query execution logs
