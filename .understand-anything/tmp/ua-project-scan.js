#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

if (!projectRoot || !outputPath) {
  console.error("Usage: node script.js <project-root> <output-path>");
  process.exit(1);
}

const defaults = ['node_modules', 'node_modules/', '.git', '.git/', 'vendor', 'venv', '.venv', '__pycache__', 'dist', 'build', 'out', 'coverage', '.next', '.cache', '.turbo', 'target', 'obj'];
const extensions = {
  '.py': 'python', '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
  '.go': 'go', '.rs': 'rust', '.java': 'java', '.rb': 'ruby', '.cpp': 'cpp', '.c': 'c', '.cs': 'csharp',
  '.swift': 'swift', '.kt': 'kotlin', '.php': 'php', '.vue': 'svelte', '.svelte': 'svelte',
  '.sh': 'shell', '.bash': 'shell', '.md': 'markdown', '.rst': 'markdown', '.yaml': 'yaml', '.yml': 'yaml',
  '.json': 'json', '.toml': 'toml', '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
  '.proto': 'protobuf', '.tf': 'terraform', '.html': 'html', '.htm': 'html', '.css': 'css',
  '.scss': 'css', '.sass': 'css', '.less': 'css', '.xml': 'xml'
};
const categoryMap = {
  'dockerfile': 'infra', 'docker-compose.yml': 'infra', 'docker-compose.yaml': 'infra',
  '.tf': 'infra', 'Makefile': 'infra', '.sql': 'data', '.graphql': 'data', '.gql': 'data',
  '.proto': 'data', '.sh': 'script', '.bash': 'script', '.md': 'docs', '.rst': 'docs', '.txt': 'docs',
  '.yaml': 'config', '.yml': 'config', '.json': 'config', '.toml': 'config', '.xml': 'config',
  '.env': 'config', '.ini': 'config', '.cfg': 'config'
};

function shouldExclude(filePath) {
  const relPath = path.relative(projectRoot, filePath);
  for (const d of defaults) {
    if (relPath.includes(d + path.sep) || relPath === d) return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.pdf', '.zip', '.tar', '.gz', '.lock', '.min.js', '.min.css', '.map'].includes(ext)) return true;
  if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'LICENSE', '.gitignore', '.editorconfig'].includes(base)) return true;
  return false;
}

function getCategory(filePath) {
  const base = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  if (base === 'dockerfile' || base.startsWith('docker-compose')) return 'infra';
  if (base.endsWith('.tf') || base === 'makefile') return 'infra';
  if (['.sql', '.graphql', '.gql', '.proto'].includes(ext)) return 'data';
  if (['.sh', '.bash'].includes(ext)) return 'script';
  if (['.md', '.rst'].includes(ext)) return 'docs';
  if (['.yaml', '.yml', '.json', '.toml', '.xml'].includes(ext)) return 'config';
  if (base.startsWith('.env') && base !== '.env') return 'config';
  if (base === 'makefile') return 'infra';
  return 'code';
}

function getLanguage(filePath) {
  const base = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  if (base === 'dockerfile') return 'dockerfile';
  if (base === 'makefile') return 'makefile';
  return extensions[ext] || 'unknown';
}

try {
  const files = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf-8' }).split('\n').filter(f => f);
  const fileList = [];
  const importMap = {};

  for (const f of files) {
    const fullPath = path.join(projectRoot, f);
    if (!fs.existsSync(fullPath) || shouldExclude(fullPath)) continue;
    try {
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) continue;
      const lines = stats.size > 0 ? fs.readFileSync(fullPath, 'utf-8').split('\n').length : 0;
      const lang = getLanguage(fullPath);
      const cat = getCategory(fullPath);
      fileList.push({ path: f, language: lang, sizeLines: lines, fileCategory: cat });
      importMap[f] = [];
    } catch (e) {}
  }

  const name = 'vektor-labs';
  const readmePath = path.join(projectRoot, 'README.md');
  const readmeHead = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8').split('\n').slice(0, 10).join('\n') : '';
  const languages = [...new Set(fileList.map(f => f.language))].filter(l => l !== 'unknown').sort();
  const frameworks = ['FastAPI', 'React', 'Vite', 'TailwindCSS', 'SQLAlchemy', 'TimescaleDB', 'Redis', 'Docker'];

  const result = {
    scriptCompleted: true,
    name,
    rawDescription: 'Institutional-grade market intelligence for crypto futures traders',
    readmeHead,
    languages,
    frameworks,
    files: fileList.sort((a, b) => a.path.localeCompare(b.path)),
    totalFiles: fileList.length,
    filteredByIgnore: 0,
    estimatedComplexity: fileList.length > 150 ? 'large' : fileList.length > 30 ? 'moderate' : 'small',
    importMap
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log('Scan complete: ' + fileList.length + ' files');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}