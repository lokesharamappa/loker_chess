#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SpecificationCreator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../../specs/templates');
  }

  create(options) {
    const { type, title, author } = options;
    
    if (!type || !title) {
      console.error('Error: --type and --title are required');
      process.exit(1);
    }

    const templatePath = path.join(this.templatesDir, `${type}.md`);
    
    if (!fs.existsSync(templatePath)) {
      console.error(`Error: Template not found for type: ${type}`);
      console.error('Available types:', this.getAvailableTypes());
      process.exit(1);
    }

    const specId = this.generateSpecId(type);
    const today = new Date().toISOString().split('T')[0];
    
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    template = template.replace(/\[Feature Name\]/g, title);
    template = template.replace(/\[API Name\]/g, title);
    template = template.replace(/\[Bug Fix Title\]/g, title);
    template = template.replace(/\[Author Name\]/g, author || 'Developer');
    template = template.replace(/SPEC-2026-03-30-001/g, specId);
    template = template.replace(/SPEC-API-2026-03-30-001/g, specId);
    template = template.replace(/SPEC-BUG-2026-03-30-001/g, specId);
    template = template.replace(/2026-03-30/g, today);

    const specsDir = path.join(__dirname, '../../specs', `${type}s`);
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    const filename = `${specId}-${this.slugify(title)}.md`;
    const filePath = path.join(specsDir, filename);
    
    fs.writeFileSync(filePath, template);
    
    console.log(`✅ Specification created: ${filePath}`);
    console.log(`📝 ID: ${specId}`);
    console.log(`👤 Author: ${author || 'Developer'}`);
    console.log(`📅 Created: ${today}`);
    
    return filePath;
  }

  generateSpecId(type) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const prefix = type === 'api' ? 'SPEC-API' : 
                   type === 'bug' ? 'SPEC-BUG' : 
                   type === 'refactor' ? 'SPEC-REF' : 'SPEC';
    
    return `${prefix}-${date}-${random}`;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  getAvailableTypes() {
    if (!fs.existsSync(this.templatesDir)) {
      return [];
    }
    
    return fs.readdirSync(this.templatesDir)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  }

  list() {
    const specsDir = path.join(__dirname, '../../specs');
    
    if (!fs.existsSync(specsDir)) {
      console.log('No specifications found.');
      return;
    }

    console.log('📋 Available Specifications:');
    console.log('');

    const types = ['features', 'apis', 'bugs', 'refactors'];
    
    for (const type of types) {
      const typeDir = path.join(specsDir, type);
      if (fs.existsSync(typeDir)) {
        const files = fs.readdirSync(typeDir).filter(file => file.endsWith('.md'));
        
        if (files.length > 0) {
          console.log(`📁 ${type.charAt(0).toUpperCase() + type.slice(1, -1)}s:`);
          files.forEach(file => {
            const filePath = path.join(typeDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const titleMatch = content.match(/title:\s*"([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : file;
            console.log(`   📄 ${file} - ${title}`);
          });
          console.log('');
        }
      }
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node create-spec.js [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  create    Create a new specification');
    console.log('  list      List all specifications');
    console.log('');
    console.log('Create Options:');
    console.log('  --type <type>       Specification type (feature, api, bug, refactor)');
    console.log('  --title <title>     Specification title');
    console.log('  --author <author>   Author name (optional)');
    console.log('');
    console.log('Examples:');
    console.log('  node create-spec.js create --type feature --title "User Authentication"');
    console.log('  node create-spec.js create --type api --title "User API" --author "John Doe"');
    console.log('  node create-spec.js list');
    process.exit(1);
  }

  const command = args[0];
  const creator = new SpecificationCreator();
  
  switch (command) {
    case 'create':
      handleCreate(args, creator);
      break;
    case 'list':
      creator.list();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

function handleCreate(args, creator) {
  let type = null;
  let title = null;
  let author = null;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--type' && i + 1 < args.length) {
      type = args[i + 1];
      i++;
    } else if (args[i] === '--title' && i + 1 < args.length) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--author' && i + 1 < args.length) {
      author = args[i + 1];
      i++;
    }
  }

  creator.create({ type, title, author });
}

if (require.main === module) {
  main();
}

module.exports = SpecificationCreator;
