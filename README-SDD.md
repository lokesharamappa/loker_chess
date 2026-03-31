# Specification Driven Development (SDD)

This project uses **Specification Driven Development (SDD)** as the primary development methodology. SDD ensures that detailed specifications are created BEFORE any code is written, making specifications the single source of truth for requirements, design, and testing.

## Quick Start

### 1. Create a Specification
```bash
node .windsurf/tools/create-spec.js create --type feature --title "Your Feature Title"
```

### 2. Validate Your Specification
```bash
node .windsurf/tools/validate-spec.js --spec specs/features/SPEC-2026-03-30-001.md
```

### 3. Generate Tests from Specification
```bash
node .windsurf/tools/generate-tests.js --spec specs/features/SPEC-2026-03-30-001.md
```

### 4. Follow TDD with Generated Tests
- Run tests (they should fail initially)
- Implement the feature
- Run tests again (they should pass)

## SDD Workflow

1. **Specification Creation** - Write detailed specification document
2. **Specification Review** - Get specification reviewed and approved
3. **Test Generation** - Generate test cases from specification
4. **Implementation** - Write code based on specification
5. **Testing** - Verify implementation meets specification
6. **Documentation** - Update specification if needed

## Specification Types

- **Feature** - New functionality and features
- **API** - API endpoints and interfaces
- **Bug** - Bug fixes and patches
- **Refactor** - Code refactoring and improvements

## File Structure

```
specs/
├── features/           # Feature specifications
├── apis/              # API specifications
├── bugs/              # Bug fix specifications
├── refactors/         # Refactoring specifications
├── templates/         # Specification templates
└── examples/          # Example specifications
```

## Tools

### create-spec.js
Create new specifications from templates.
```bash
node .windsurf/tools/create-spec.js create --type <type> --title "<title>" --author "<author>"
node .windsurf/tools/create-spec.js list
```

### validate-spec.js
Validate specification format and completeness.
```bash
node .windsurf/tools/validate-spec.js --spec <path-to-spec>
```

### generate-tests.js
Generate test cases from specifications.
```bash
node .windsurf/tools/generate-tests.js --spec <path-to-spec>
```

## SDD Rules

1. **No Code Without Specification** - No implementation without approved specification
2. **Specification is Truth** - Specification is the single source of truth
3. **Test Against Spec** - Tests verify implementation meets specification
4. **Keep Spec Updated** - Update specification when implementation changes
5. **Review Required** - All specifications must be reviewed before implementation

## Integration with TDD

SDD complements Test-Driven Development:

1. **Specification** - Create detailed specification first
2. **Test Generation** - Generate tests from specification
3. **TDD Cycle** - Write failing tests, implement code, make tests pass
4. **Verification** - Ensure implementation meets specification

## Example Specification

See `specs/examples/SPEC-2026-03-30-001-user-authentication.md` for a complete example of a feature specification.

## Getting Help

- Use `/sdd` workflow command for specification guidance
- Reference templates in `specs/templates/`
- Check validation errors for missing required sections
- Review examples for best practices

## Best Practices

- **Be Specific** - Avoid vague language in specifications
- **Include Examples** - Provide concrete examples and use cases
- **Think Edge Cases** - Consider error conditions and edge cases
- **Define Metrics** - Include measurable success criteria
- **Consider Security** - Address security implications
- **Plan for Testing** - Design for testability
- **Document Decisions** - Record why decisions were made
- **Keep Current** - Update specifications as requirements evolve
