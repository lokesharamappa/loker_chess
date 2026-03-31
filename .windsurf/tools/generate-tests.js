#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TestGenerator {
  constructor() {
    this.testTemplates = {
      feature: this.getFeatureTestTemplate(),
      api: this.getApiTestTemplate(),
      bug: this.getBugTestTemplate()
    };
  }

  generate(specPath) {
    console.log(`Generating tests for specification: ${specPath}`);
    
    if (!fs.existsSync(specPath)) {
      console.error(`Specification file not found: ${specPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(specPath, 'utf8');
    const spec = this.parseSpecification(content);
    
    if (!spec) {
      console.error('Failed to parse specification');
      process.exit(1);
    }

    const tests = this.generateTests(spec);
    const testPath = this.getTestPath(spec);
    
    fs.writeFileSync(testPath, tests);
    
    console.log(`✅ Tests generated: ${testPath}`);
    console.log(`📝 Generated ${this.countTestCases(tests)} test cases`);
    
    return testPath;
  }

  parseSpecification(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
    const body = content.slice(frontmatterMatch[0].length);
    
    return {
      ...frontmatter,
      body,
      testCases: this.extractTestCases(body),
      requirements: this.extractRequirements(body),
      apiEndpoints: this.extractApiEndpoints(body)
    };
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

  extractTestCases(body) {
    const testCases = [];
    const testCaseRegex = /\*\*TC-(\d+):\*\* ([^\n]+)\n([\s\S]*?)(?=\*\*TC-\d+:|\*\*Performance|\*\*Rollback|###)/g;
    
    let match;
    while ((match = testCaseRegex.exec(body)) !== null) {
      const [, number, description, details] = match;
      const givenMatch = details.match(/\*\*Given:\*\* ([^\n]+)/);
      const whenMatch = details.match(/\*\*When:\*\* ([^\n]+)/);
      const thenMatch = details.match(/\*\*Then:\*\* ([^\n]+)/);
      
      testCases.push({
        number: parseInt(number),
        description,
        given: givenMatch ? givenMatch[1] : '',
        when: whenMatch ? whenMatch[1] : '',
        then: thenMatch ? thenMatch[1] : ''
      });
    }
    
    return testCases;
  }

  extractRequirements(body) {
    const requirements = [];
    const reqRegex = /\*\*(FR|NFR)-(\d+):\*\* ([^\n]+)/g;
    
    let match;
    while ((match = reqRegex.exec(body)) !== null) {
      const [, type, number, description] = match;
      requirements.push({
        type,
        number: parseInt(number),
        description
      });
    }
    
    return requirements;
  }

  extractApiEndpoints(body) {
    const endpoints = [];
    const endpointRegex = /### (GET|POST|PUT|DELETE|PATCH) ([^\n]+)/g;
    
    let match;
    while ((match = endpointRegex.exec(body)) !== null) {
      const [, method, path] = match;
      endpoints.push({ method, path });
    }
    
    return endpoints;
  }

  generateTests(spec) {
    const type = spec.type || 'feature';
    const template = this.testTemplates[type];
    
    if (!template) {
      console.warn(`No test template found for type: ${type}`);
      return this.generateGenericTests(spec);
    }
    
    return template(spec);
  }

  getFeatureTestTemplate() {
    return (spec) => `/**
 * Test suite for ${spec.title}
 * Generated from specification: ${spec.id}
 * Author: ${spec.author}
 * Created: ${spec.created}
 */

const { expect } = require('chai');
const { describe, it, before, after } = 'mocha');

// Import the module being tested
// const ${this.getModuleName(spec.title)} = require('../../src/${this.getModulePath(spec.title)}');

describe('${spec.title}', () => {
  ${this.generateFeatureTests(spec)}
});
`;
  }

  getApiTestTemplate() {
    return (spec) => `/**
 * Test suite for ${spec.title}
 * Generated from specification: ${spec.id}
 * Author: ${spec.author}
 * Created: ${spec.created}
 */

const { expect } = require('chai');
const { describe, it, before, after } = 'mocha');
const request = require('supertest');
const app = require('../../src/app');

describe('${spec.title}', () => {
  ${this.generateApiTests(spec)}
});
`;
  }

  getBugTestTemplate() {
    return (spec) => `/**
 * Test suite for ${spec.title}
 * Generated from specification: ${spec.id}
 * Author: ${spec.author}
 * Created: ${spec.created}
 */

const { expect } = require('chai');
const { describe, it, before, after } = 'mocha';

// Import the module being tested
// const ${this.getModuleName(spec.title)} = require('../../src/${this.getModulePath(spec.title)}');

describe('${spec.title}', () => {
  ${this.generateBugTests(spec)}
});
`;
  }

  generateFeatureTests(spec) {
    let tests = '';
    
    // Generate tests for functional requirements
    spec.requirements
      .filter(req => req.type === 'FR')
      .forEach(req => {
        tests += `
  it('should implement functional requirement FR-${req.number}: ${req.description}', () => {
    // TODO: Implement test for FR-${req.number}
    // ${req.description}
    expect(true).to.be.true; // Placeholder
  });
`;
      });
    
    // Generate tests for test cases
    spec.testCases.forEach(testCase => {
      tests += `
  it('should ${testCase.description.toLowerCase()}', () => {
    // Given: ${testCase.given}
    // When: ${testCase.when}
    // Then: ${testCase.then}
    
    // TODO: Implement test case TC-${testCase.number}
    expect(true).to.be.true; // Placeholder
  });
`;
    });
    
    return tests;
  }

  generateApiTests(spec) {
    let tests = '';
    
    // Generate tests for API endpoints
    spec.apiEndpoints.forEach(endpoint => {
      tests += `
  describe('${endpoint.method} ${endpoint.path}', () => {
    it('should return valid response', async () => {
      const response = await request(app)
        .${endpoint.method.toLowerCase()}(endpoint.path)
        .expect(200);
      
      expect(response.body).to.be.an('object');
      // TODO: Add specific assertions based on API specification
    });
    
    it('should handle invalid input', async () => {
      const response = await request(app)
        .${endpoint.method.toLowerCase()}(endpoint.path)
        .send({ invalid: 'data' })
        .expect(400);
      
      expect(response.body).to.have.property('error');
    });
  });
`;
    });
    
    return tests;
  }

  generateBugTests(spec) {
    let tests = '';
    
    // Generate tests for bug fix verification
    spec.testCases.forEach(testCase => {
      tests += `
  it('should ${testCase.description.toLowerCase()}', () => {
    // Given: ${testCase.given}
    // When: ${testCase.when}
    // Then: ${testCase.then}
    
    // TODO: Implement test case TC-${testCase.number}
    expect(true).to.be.true; // Placeholder
  });
`;
    });
    
    return tests;
  }

  generateGenericTests(spec) {
    return `/**
 * Test suite for ${spec.title}
 * Generated from specification: ${spec.id}
 * Author: ${spec.author}
 * Created: ${spec.created}
 */

const { expect } = require('chai');
const { describe, it } = 'mocha';

describe('${spec.title}', () => {
  // TODO: Generate tests based on specification requirements
  
  it('should be implemented', () => {
    expect(true).to.be.true; // Placeholder
  });
});
`;
  }

  getTestPath(spec) {
    const testsDir = path.join(__dirname, '../../tests');
    const typeDir = spec.type || 'feature';
    
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }
    
    const filename = `test_${this.slugify(spec.title)}.js`;
    return path.join(testsDir, filename);
  }

  getModuleName(title) {
    return title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  getModulePath(title) {
    return this.slugify(title);
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  countTestCases(tests) {
    const matches = tests.match(/it\(/g);
    return matches ? matches.length : 0;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node generate-tests.js --spec <path-to-spec>');
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

  const generator = new TestGenerator();
  generator.generate(specPath);
}

if (require.main === module) {
  main();
}

module.exports = TestGenerator;
