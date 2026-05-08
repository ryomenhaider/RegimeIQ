#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

const scanResult = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/intermediate/scan-result.json'), 'utf8'));
const files = scanResult.files;
const nodes = [];
const edges = [];

const categoryToType = {
  'code': 'file',
  'config': 'config',
  'docs': 'document',
  'infra': 'service',
  'data': 'table',
  'script': 'file',
  'markup': 'file'
};

const complexityMap = {
  'code': (lines) => lines < 50 ? 'simple' : lines < 200 ? 'moderate' : 'complex',
  'config': () => 'simple',
  'docs': (lines) => lines < 100 ? 'simple' : 'moderate',
  'infra': () => 'moderate',
  'data': (lines) => lines < 100 ? 'simple' : 'moderate',
  'script': () => 'simple',
  'markup': () => 'simple'
};

function getTags(filePath, category) {
  const base = path.basename(filePath).toLowerCase();
  const tags = [];
  
  if (base === '__init__.py' || base === 'index.js') tags.push('barrel', 'entry-point');
  if (base.includes('test') || base.includes('_test')) tags.push('test');
  if (base === 'main.py' || base === 'main.js') tags.push('entry-point');
  if (base === 'dockerfile') tags.push('containerization', 'infrastructure');
  if (base.startsWith('docker-compose')) tags.push('orchestration', 'infrastructure');
  if (filePath.includes('/api/')) tags.push('api');
  if (filePath.includes('/core/')) tags.push('core', 'infrastructure');
  if (filePath.includes('/modules/')) tags.push('module', 'business-logic');
  if (filePath.includes('/ingestion/')) tags.push('data-pipeline', 'etl');
  if (filePath.includes('/frontend/')) tags.push('frontend', 'ui');
  if (filePath.includes('/models/')) tags.push('data-model', 'orm');
  if (filePath.includes('/routers/') || filePath.includes('/routes/')) tags.push('api-handler', 'endpoint');
  if (filePath.includes('/middleware/')) tags.push('middleware', 'request-processing');
  if (filePath.includes('/services/')) tags.push('service', 'business-logic');
  if (filePath.includes('/migrations/') || filePath.includes('/storage/')) tags.push('migration', 'database');
  if (filePath.includes('/deployment/')) tags.push('deployment', 'infrastructure');
  if (filePath.endsWith('.md')) tags.push('documentation');
  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) tags.push('configuration', 'ci-cd');
  if (filePath.endsWith('.sql')) tags.push('database', 'schema');
  if (filePath.endsWith('.py')) tags.push('python');
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) tags.push('javascript', 'web');
  
  if (tags.length < 3) tags.push(category);
  return tags.slice(0, 5);
}

function getSummary(filePath, category, lines) {
  const base = path.basename(filePath);
  const dir = path.dirname(filePath);
  
  const summaries = {
    'api/main.py': 'FastAPI application entry point that initializes all modules and starts the server.',
    'main.py': 'Main application entry point that bootstraps the VektorLabs system.',
    'Dockerfile': 'Container definition for building the application image.',
    'docker-compose.yml': 'Development infrastructure configuration for PostgreSQL and Redis services.',
    'pyproject.toml': 'Python project configuration with dependencies and build settings.',
    'README.md': 'Project documentation with installation, architecture, and API reference.',
    'requirements.txt': 'Python dependencies list for the backend application.'
  };
  
  if (summaries[filePath]) return summaries[filePath];
  
  if (filePath.includes('/api/')) return `API module in ${dir.replace(projectRoot, '')} providing REST endpoints.`;
  if (filePath.includes('/core/')) return `Core infrastructure component in ${dir.replace(projectRoot, '')}.`;
  if (filePath.includes('/modules/')) return `Business logic module in ${dir.replace(projectRoot, '')} for market analysis.`;
  if (filePath.includes('/ingestion/')) return `Data ingestion pipeline in ${dir.replace(projectRoot, '')} for ETL operations.`;
  if (filePath.includes('/frontend/')) return `Frontend React component in ${dir.replace(projectRoot, '')}.`;
  if (filePath.includes('/migrations/')) return `Database migration in ${dir.replace(projectRoot, '')} defining schema changes.`;
  if (filePath.includes('/storage/')) return `Storage layer in ${dir.replace(projectRoot, '')} with database schema definitions.`;
  if (filePath.includes('/deployment/')) return `Deployment configuration in ${dir.replace(projectRoot, '')} for infrastructure.`;
  
  return `${category.charAt(0).toUpperCase() + category.slice(1)} file in ${dir.replace(projectRoot, '')} with ${lines} lines.`;
}

function extractImportsPython(filePath, content) {
  const imports = [];
  const lines = content.split('\n');
  const baseDir = path.dirname(filePath);
  
  for (const line of lines) {
    const match = line.match(/^(?:from\s+(\.[a-zA-Z0-9_]*)|import\s+(\.[a-zA-Z0-9_]*))/);
    if (match) {
      const module = match[1] || match[2];
      if (module) {
        let resolved = module.replace(/^\.+/, '').replace(/\./g, '/');
        const candidates = [
          path.join(baseDir, resolved + '.py'),
          path.join(baseDir, resolved, '__init__.py'),
          path.join(projectRoot, 'api', resolved + '.py'),
          path.join(projectRoot, 'api', resolved, '__init__.py'),
          path.join(projectRoot, 'modules', resolved + '.py'),
          path.join(projectRoot, 'modules', resolved, '__init__.py')
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            const relPath = path.relative(projectRoot, c);
            if (!imports.includes(relPath)) imports.push(relPath);
            break;
          }
        }
      }
    }
  }
  return imports;
}

function extractImportsJs(filePath, content) {
  const imports = [];
  const baseDir = path.dirname(filePath);
  
  const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
  
  for (const match of requireMatches) {
    const imp = match[1];
    if (!imp.startsWith('.') && !imp.startsWith('/')) continue;
    
    let resolved = path.resolve(baseDir, imp);
    const exts = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'];
    for (const ext of exts) {
      const candidate = resolved + ext;
      if (fs.existsSync(candidate)) {
        const relPath = path.relative(projectRoot, candidate);
        if (!imports.includes(relPath)) imports.push(relPath);
        break;
      }
    }
  }
  
  return imports;
}

// Create nodes
for (const file of files) {
  const filePath = path.join(projectRoot, file.path);
  if (!fs.existsSync(filePath)) continue;
  
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    continue;
  }
  
  const category = file.fileCategory;
  const type = categoryToType[category] || 'file';
  const idPrefix = type === 'config' ? 'config:' : type === 'document' ? 'document:' : 
                   type === 'service' ? 'service:' : type === 'table' ? 'table:' : 
                   type === 'schema' ? 'schema:' : type === 'pipeline' ? 'pipeline:' : 'file:';
  
  const node = {
    id: idPrefix + file.path,
    type: type,
    name: path.basename(file.path),
    filePath: file.path,
    summary: getSummary(file.path, category, file.sizeLines),
    tags: getTags(file.path, category),
    complexity: complexityMap[category] ? complexityMap[category](file.sizeLines) : 'simple'
  };
  
  nodes.push(node);
  
  // Extract imports and create edges
  const ext = path.extname(file.path).toLowerCase();
  let fileImports = [];
  
  if (ext === '.py') {
    fileImports = extractImportsPython(file.path, content);
  } else if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    fileImports = extractImportsJs(file.path, content);
  }
  
  for (const imp of fileImports) {
    edges.push({
      source: 'file:' + file.path,
      target: 'file:' + imp,
      type: 'imports',
      direction: 'forward',
      weight: 0.7
    });
  }
}

// Add cross-category edges based on file relationships
const dockerfiles = nodes.filter(n => n.filePath.includes('Dockerfile'));
const dockerCompose = nodes.filter(n => n.filePath.includes('docker-compose'));
const sqlFiles = nodes.filter(n => n.filePath.endsWith('.sql'));
const readme = nodes.filter(n => n.filePath === 'README.md');

// Dockerfile -> deploys -> main application
for (const df of dockerfiles) {
  const mainFiles = nodes.filter(n => n.name === 'main.py' || n.name === 'main.js' || n.name === 'index.js');
  for (const mf of mainFiles) {
    edges.push({
      source: df.id,
      target: mf.id,
      type: 'deploys',
      direction: 'forward',
      weight: 0.7
    });
  }
}

// docker-compose -> depends_on -> Dockerfile
for (const dc of dockerCompose) {
  for (const df of dockerfiles) {
    edges.push({
      source: dc.id,
      target: df.id,
      type: 'depends_on',
      direction: 'forward',
      weight: 0.6
    });
  }
}

// README -> documents -> main entry points
for (const rd of readme) {
  const entryPoints = nodes.filter(n => n.tags.includes('entry-point') || n.name === 'main.py');
  for (const ep of entryPoints) {
    edges.push({
      source: rd.id,
      target: ep.id,
      type: 'documents',
      direction: 'forward',
      weight: 0.5
    });
  }
}

// SQL migrations -> migrates -> tables (inferred from file names)
for (const sql of sqlFiles) {
  const tableMatch = sql.filePath.match(/(\d+)_([a-zA-Z_]+)\.sql/);
  if (tableMatch) {
    edges.push({
      source: sql.id,
      target: 'table:' + sql.filePath + ':' + tableMatch[2],
      type: 'migrates',
      direction: 'forward',
      weight: 0.7
    });
  }
}

// Config -> configures -> related code files
const configFiles = nodes.filter(n => n.type === 'config');
const codeFiles = nodes.filter(n => n.type === 'file' && n.filePath.includes('/api/'));
for (const cf of configFiles) {
  for (const cdf of codeFiles.slice(0, 3)) {
    edges.push({
      source: cf.id,
      target: cdf.id,
      type: 'configures',
      direction: 'forward',
      weight: 0.6
    });
  }
}

const result = { nodes, edges };
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Generated ${nodes.length} nodes and ${edges.length} edges`);