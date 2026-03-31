---
description: Specification Driven Development (SDD) workflow
---

## Specification Driven Development (SDD)

SDD is a development methodology where detailed specifications are created BEFORE any code is written. Specifications serve as the single source of truth for requirements, design, and testing.

### SDD Workflow Steps

1. **Create Specification** - Write detailed specification document
2. **Review Specification** - Get specification reviewed and approved
3. **Implement from Specification** - Write code based on specification
4. **Test Against Specification** - Verify implementation meets specification
5. **Update Specification** - Keep specification in sync with changes

### Specification Structure

Every specification must include:

#### 1. Metadata
- **Title**: Clear, descriptive name
- **ID**: Unique identifier (format: SPEC-YYYY-MM-DD-NNN)
- **Author**: Who wrote the specification
- **Status**: Draft, Review, Approved, Implemented, Deprecated
- **Created**: Creation date
- **Updated**: Last modification date

#### 2. Overview
- **Problem Statement**: What problem does this solve?
- **Goals**: What are the success criteria?
- **Scope**: What's in and out of scope
- **Stakeholders**: Who is affected by this change

#### 3. Requirements
- **Functional Requirements**: What the system must do
- **Non-Functional Requirements**: Performance, security, usability
- **Constraints**: Technical, business, or regulatory constraints
- **Dependencies**: What this feature depends on

#### 4. Design
- **Architecture**: High-level design approach
- **API Design**: Endpoints, request/response formats
- **Data Model**: Database schema, data structures
- **User Interface**: Mockups, wireframes, interaction flows

#### 5. Implementation Plan
- **Tasks**: Breakdown of implementation tasks
- **Order**: Sequence of implementation
- **Risks**: Potential issues and mitigations
- **Testing Strategy**: How to verify the implementation

#### 6. Acceptance Criteria
- **Definition of Done**: When is this feature complete?
- **Test Cases**: Specific scenarios to verify
- **Performance Criteria**: Benchmarks to meet
- **Rollback Plan**: How to revert if needed

### Specification Templates

#### Feature Specification Template
```markdown
---
title: "[Feature Name]"
id: "SPEC-2026-03-30-001"
author: "[Author Name]"
status: "Draft"
created: "2026-03-30"
updated: "2026-03-30"
---

## Overview
### Problem Statement
### Goals
### Scope
### Stakeholders

## Requirements
### Functional Requirements
### Non-Functional Requirements
### Constraints
### Dependencies

## Design
### Architecture
### API Design
### Data Model
### User Interface

## Implementation Plan
### Tasks
### Order
### Risks
### Testing Strategy

## Acceptance Criteria
### Definition of Done
### Test Cases
### Performance Criteria
### Rollback Plan
```

#### API Specification Template
```markdown
---
title: "[API Name]"
id: "SPEC-API-2026-03-30-001"
author: "[Author Name]"
status: "Draft"
created: "2026-03-30"
updated: "2026-03-30"
---

## Overview
### Purpose
### Scope
### Version

## Endpoints
### [Method] [Path]
#### Description
#### Request Parameters
#### Request Body
#### Response
#### Error Codes
#### Examples

## Data Models
### [Model Name]
#### Fields
#### Validation Rules
#### Examples

## Security
### Authentication
### Authorization
### Rate Limiting
### Data Validation

## Testing
### Unit Tests
### Integration Tests
### Performance Tests
```

### SDD Commands and Tools

// turbo
1. Create new specification:
```
node .windsurf/tools/create-spec.js --type feature --title "Feature Title"
```

// turbo
2. Validate specification format:
```
node .windsurf/tools/validate-spec.js --spec specs/SPEC-2026-03-30-001.md
```

// turbo
3. Generate test cases from specification:
```
node .windsurf/tools/generate-tests.js --spec specs/SPEC-2026-03-30-001.md
```

// turbo
4. Check specification coverage:
```
node .windsurf/tools/spec-coverage.js
```

// turbo
5. List all specifications:
```
find specs/ -name "*.md" -exec basename {} \; | sort
```

// turbo
6. Search specifications:
```
grep -r "search term" specs/
```

### SDD Rules

1. **No Code Without Specification**: No implementation code can be written without an approved specification
2. **Specification is Truth**: The specification is the single source of truth for requirements
3. **Test Against Spec**: All tests must verify that the implementation meets the specification
4. **Keep Spec Updated**: Any changes to implementation must be reflected in the specification
5. **Review Required**: All specifications must be reviewed before implementation
6. **Version Control**: All specifications must be version controlled

### Specification Quality Checklist

- [ ] Has clear problem statement
- [ ] Defines measurable success criteria
- [ ] Specifies in-scope and out-of-scope items
- [ ] Includes all functional requirements
- [ ] Includes relevant non-functional requirements
- [ ] Has detailed design section
- [ ] Provides implementation guidance
- [ ] Defines acceptance criteria
- [ ] Includes test cases
- [ ] Has rollback plan
- [ ] Is reviewed and approved

### Integration with Existing Workflows

SDD complements the existing TDD workflow:

1. **Specification**: Create detailed specification first
2. **TDD**: Write tests based on specification acceptance criteria
3. **Implementation**: Write code to pass tests and meet specification
4. **Review**: Verify both code and specification alignment

### File Structure

```
specs/
├── features/
│   ├── SPEC-2026-03-30-001-feature-name.md
│   └── SPEC-2026-03-30-002-another-feature.md
├── apis/
│   ├── SPEC-API-2026-03-30-001-api-name.md
│   └── SPEC-API-2026-03-30-002-another-api.md
├── bugs/
│   └── SPEC-BUG-2026-03-30-001-bug-fix.md
├── refactors/
│   └── SPEC-REF-2026-03-30-001-refactor.md
└── templates/
    ├── feature.md
    ├── api.md
    ├── bug.md
    └── refactor.md
```

### Specification Status Workflow

1. **Draft** → Initial specification written
2. **Review** → Specification is being reviewed
3. **Approved** → Specification approved for implementation
4. **Implemented** → Code implemented and tested
5. **Deprecated** → Specification no longer relevant

### Best Practices

- **Be Specific**: Avoid vague language
- **Include Examples**: Provide concrete examples
- **Think Edge Cases**: Consider error conditions
- **Define Metrics**: Include measurable criteria
- **Consider Security**: Address security implications
- **Plan for Testing**: Design for testability
- **Document Decisions**: Record why decisions were made
- **Keep it Current**: Update as requirements evolve
