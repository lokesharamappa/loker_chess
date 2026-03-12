/**
 * @fileoverview Legacy server entry point - redirects to new structure
 * @author Chess Master Pro Team
 * @version 1.0.0
 * @deprecated Use src/server.js instead
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup require for ES modules
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import and run the new server
import('./src/server.js');
