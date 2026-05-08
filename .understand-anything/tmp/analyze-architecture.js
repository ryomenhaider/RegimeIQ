#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

const graphPath = path.join(projectRoot, '.understand-anything/intermediate/assembled-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

const nodes = graph.nodes;
const fileNodes = nodes.filter(n => ['file', 'config', 'document', 'service', 'pipeline', 'table', 'schema', 'resource', 'endpoint'].includes(n.type));

function getTopLevelDir(filePath) {
  const parts = filePath.split('/');
  if (parts.length === 1) return 'root';
  return parts[0];
}

function mapDirToLayer(dir) {
  const mapping = {
    'api': 'layer:api',
    'core': 'layer:core',
    'modules': 'layer:business-logic',
    'ingestion': 'layer:data-pipeline',
    'frontend': 'layer:frontend',
    'tests': 'layer:tests',
    'scripts': 'layer:utilities',
    'migrations': 'layer:data',
    'storage': 'layer:data',
    'deployment': 'layer:infrastructure',
    'blueprints': 'layer:documentation',
    '.github': 'layer:infrastructure',
    'root': 'layer:config'
  };
  return mapping[dir] || 'layer:other';
}

const layerMap = {};
for (const node of fileNodes) {
  const topDir = getTopLevelDir(node.filePath);
  const layerId = mapDirToLayer(topDir);
  if (!layerMap[layerId]) {
    layerMap[layerId] = [];
  }
  layerMap[layerId].push(node.id);
}

const layerNames = {
  'layer:api': 'API Layer',
  'layer:core': 'Core Infrastructure',
  'layer:business-logic': 'Business Logic',
  'layer:data-pipeline': 'Data Pipeline',
  'layer:frontend': 'Frontend',
  'layer:tests': 'Tests',
  'layer:utilities': 'Utilities',
  'layer:data': 'Data Layer',
  'layer:infrastructure': 'Infrastructure',
  'layer:documentation': 'Documentation',
  'layer:config': 'Configuration',
  'layer:other': 'Other'
};

const layerDescriptions = {
  'layer:api': 'FastAPI routers and API endpoint handlers for REST and WebSocket services',
  'layer:core': 'Core configuration, database connections, Redis bus, and state management',
  'layer:business-logic': 'Market microstructure models, HMM regime detection, alternative data ingestion, and LLM reasoning modules',
  'layer:data-pipeline': 'ETL pipeline for extracting, transforming, and loading market data',
  'layer:frontend': 'React dashboard components, pages, hooks, and UI state management',
  'layer:tests': 'Unit and integration tests for backend and frontend',
  'layer:utilities': 'Utility scripts for database setup, HMM training, and historical backfilling',
  'layer:data': 'Database schemas, migrations, and TimescaleDB table definitions',
  'layer:infrastructure': 'Docker containers, deployment configurations, and CI/CD pipelines',
  'layer:documentation': 'Project documentation and design blueprints',
  'layer:config': 'Project configuration files, environment settings, and build configurations',
  'layer:other': 'Miscellaneous files not fitting in other architectural layers'
};

const layers = Object.entries(layerMap).map(([layerId, nodeIds]) => ({
  id: layerId,
  name: layerNames[layerId] || layerId.split(':')[1],
  description: layerDescriptions[layerId] || `Files in the ${layerId} category`,
  nodeIds: nodeIds
}));

fs.writeFileSync(outputPath, JSON.stringify(layers, null, 2));
console.log(`Created ${layers.length} layers`);
for (const layer of layers) {
  console.log(`  ${layer.name}: ${layer.nodeIds.length} files`);
}