---
title: "[API Name]"
id: "SPEC-API-2026-03-30-001"
author: "[Author Name]"
status: "Draft"
created: "2026-03-30"
updated: "2026-03-30"
type: "api"
---

## Overview

### Purpose
*What this API does and why it exists*

### Scope
*What endpoints and functionality are included*

### Version
*API version (e.g., v1.0.0)*

## Endpoints

### GET /api/resource
#### Description
*Endpoint description*

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | yes | Parameter description |
| param2 | number | no | Parameter description |

#### Request Body
*Not applicable for GET requests*

#### Response
**200 OK**
```json
{
  "data": {},
  "message": "Success"
}
```

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Invalid input"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X GET "https://api.example.com/api/resource?param1=value"
```

### POST /api/resource
#### Description
*Endpoint description*

#### Request Parameters
*Query parameters if applicable*

#### Request Body
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

#### Response
**201 Created**
```json
{
  "data": {},
  "message": "Resource created"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 409 | Conflict |
| 500 | Internal Server Error |

#### Examples
```bash
curl -X POST "https://api.example.com/api/resource" \
  -H "Content-Type: application/json" \
  -d '{"field1": "value1"}'
```

## Data Models

### Resource Model
#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier |
| name | string | yes | Resource name |
| createdAt | datetime | yes | Creation timestamp |
| updatedAt | datetime | yes | Update timestamp |

#### Validation Rules
- `id`: Must be a valid UUID
- `name`: Must be 1-100 characters, alphanumeric only
- `createdAt`: Must be ISO 8601 datetime

#### Examples
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Example Resource",
  "createdAt": "2026-03-30T12:00:00Z",
  "updatedAt": "2026-03-30T12:00:00Z"
}
```

## Security

### Authentication
*How clients authenticate with this API*

### Authorization
*What permissions are required*

### Rate Limiting
*Rate limiting rules and quotas*

### Data Validation
*Input validation and sanitization*

## Testing

### Unit Tests
*Unit test requirements and coverage*

### Integration Tests
*Integration test scenarios*

### Performance Tests
*Performance benchmarks and load testing*
