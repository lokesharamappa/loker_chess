#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SpecificationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate(specPath) {
    console.log(`Validating specification: ${specPath}`);
    
    if (!fs.existsSync(specPath)) {
      this.errors.push(`Specification file not found: ${specPath}`);
      return this.report();
    }

    const content = fs.readFileSync(specPath, 'utf8');
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      this.errors.push('Missing frontmatter section');
      return this.report();
    }

    try {
      const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
      this.validateFrontmatter(frontmatter);
      
      const body = content.slice(frontmatterMatch[0].length);
      this.validateBody(body, frontmatter.type || 'feature');
      
    } catch (error) {
      this.errors.push(`Invalid frontmatter format: ${error.message}`);
    }

    return this.report();
  }

  parseFrontmatter(frontmatterText) {
    const frontmatter = {};
    const lines = frontmatterText.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return frontmatter;
  }

  validateFrontmatter(frontmatter) {
    const requiredFields = ['title', 'id', 'author', 'status', 'created', 'updated'];
    
    for (const field of requiredFields) {
      if (!frontmatter[field]) {
        this.errors.push(`Missing required frontmatter field: ${field}`);
      }
    }

    // Validate ID format
    if (frontmatter.id && !/^SPEC-\d{4}-\d{2}-\d{2}-\d{3}$/.test(frontmatter.id)) {
      this.errors.push('Invalid ID format. Expected: SPEC-YYYY-MM-DD-NNN');
    }

    // Validate status
    const validStatuses = ['Draft', 'Review', 'Approved', 'Implemented', 'Deprecated'];
    if (frontmatter.status && !validStatuses.includes(frontmatter.status)) {
      this.errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate date format
    if (frontmatter.created && !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.created)) {
      this.errors.push('Invalid created date format. Expected: YYYY-MM-DD');
    }
  }

  validateBody(body, type) {
    const requiredSections = this.getRequiredSections(type);
    
    for (const section of requiredSections) {
      const headerRegex = new RegExp(`^## ${section}`, 'm');
      if (!headerRegex.test(body)) {
        this.errors.push(`Missing required section: ## ${section}`);
      }
    }

    // Validate acceptance criteria
    if (body.includes('## Acceptance Criteria')) {
      this.validateAcceptanceCriteria(body);
    }

    // Validate requirements
    if (body.includes('## Requirements')) {
      this.validateRequirements(body);
    }
  }

  getRequiredSections(type) {
    const commonSections = ['Overview', 'Requirements', 'Acceptance Criteria'];
    
    switch (type) {
      case 'feature':
        return [...commonSections, 'Design', 'Implementation Plan'];
      case 'api':
        return ['Overview', 'Endpoints', 'Data Models', 'Security', 'Testing'];
      case 'bug':
        return ['Overview', 'Root Cause Analysis', 'Fix Strategy', 'Verification'];
      default:
        return commonSections;
    }
  }

  validateAcceptanceCriteria(body) {
    const acceptanceSection = body.match(/## Acceptance Criteria([\s\S]*?)(?=## |\Z)/);
    if (!acceptanceSection) return;

    const content = acceptanceSection[1];
    
    // Check for Definition of Done
    if (!content.includes('### Definition of Done')) {
      this.warnings.push('Acceptance Criteria should include "Definition of Done"');
    }

    // Check for Test Cases
    if (!content.includes('### Test Cases')) {
      this.warnings.push('Acceptance Criteria should include "Test Cases"');
    }

    // Validate test case format
    const testCases = content.match(/\*\*TC-\d+:\*\*/g);
    if (testCases && testCases.length === 0) {
      this.warnings.push('Test cases should follow format: **TC-NNN:** Description');
    }
  }

  validateRequirements(body) {
    const requirementsSection = body.match(/## Requirements([\s\S]*?)(?=## |\Z)/);
    if (!requirementsSection) return;

    const content = requirementsSection[1];
    
    // Check for functional requirements
    if (!content.includes('### Functional Requirements')) {
      this.warnings.push('Requirements should include "Functional Requirements"');
    }

    // Validate requirement format
    const funcReqs = content.match(/\*\*FR-\d+:\*\*/g);
    if (funcReqs && funcReqs.length === 0) {
      this.warnings.push('Functional requirements should follow format: **FR-NNN:** Description');
    }
  }

  report() {
    console.log('\n=== Specification Validation Report ===');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Specification is valid!');
      return true;
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    return this.errors.length === 0;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-spec.js --spec <path-to-spec>');
    process.exit(1);
  }

  let specPath = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spec' && i + 1 < args.length) {
      specPath = args[i + 1];
      break;
    }
  }

  if (!specPath) {
    console.error('Error: --spec argument is required');
    process.exit(1);
  }

  const validator = new SpecificationValidator();
  const isValid = validator.validate(specPath);
  
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = SpecificationValidator;
