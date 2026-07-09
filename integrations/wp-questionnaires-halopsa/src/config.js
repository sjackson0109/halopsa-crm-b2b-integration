import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function boolEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function intEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

export function loadConfig(argv = process.argv.slice(2)) {
  loadDotEnv(path.join(packageRoot, '.env'));

  const dryRun = argv.includes('--dry-run') || boolEnv('DRY_RUN', false);
  const once = argv.includes('--once') || boolEnv('POLL_ONCE', true);
  const fieldMapPath = path.resolve(packageRoot, optional('FIELD_MAP_PATH', './config/field-map.example.json'));
  const fieldMap = JSON.parse(fs.readFileSync(fieldMapPath, 'utf8'));

  return {
    runtime: {
      dryRun,
      once,
      pollIntervalSeconds: intEnv('POLL_INTERVAL_SECONDS', 300),
      pageSize: intEnv('PAGE_SIZE', 25),
      maxRetries: intEnv('MAX_RETRIES', 3)
    },
    wpq: {
      baseUrl: required('WPQ_BASE_URL').replace(/\/$/, ''),
      username: required('WPQ_USERNAME'),
      applicationPassword: required('WPQ_APPLICATION_PASSWORD')
    },
    halo: {
      baseUrl: required('HALO_BASE_URL').replace(/\/$/, ''),
      clientId: required('HALO_CLIENT_ID'),
      clientSecret: required('HALO_CLIENT_SECRET'),
      scope: optional('HALO_SCOPE', 'all'),
      tokenPath: optional('HALO_TOKEN_PATH', '/auth/token'),
      paths: {
        clients: optional('HALO_CLIENTS_PATH', '/api/Client'),
        users: optional('HALO_USERS_PATH', '/api/Users'),
        prospects: optional('HALO_PROSPECTS_PATH', '/api/Opportunities'),
        customFields: optional('HALO_CUSTOM_FIELDS_PATH', '/api/CustomFields'),
        campaignLists: optional('HALO_CAMPAIGN_LISTS_PATH', '')
      },
      defaults: {
        prospectStatusId: optional('HALO_PROSPECT_STATUS_ID', ''),
        prospectTypeId: optional('HALO_PROSPECT_TYPE_ID', ''),
        prospectInterestedStatusId: optional('HALO_PROSPECT_INTERESTED_STATUS_ID', ''),
        defaultPriorityId: optional('HALO_DEFAULT_PRIORITY_ID', '')
      },
      campaign: {
        mode: optional('HALO_CAMPAIGN_MODE', 'custom_field'),
        nameField: optional('HALO_CAMPAIGN_NAME_FIELD', 'questionnaire_name')
      }
    },
    fieldMap
  };
}
