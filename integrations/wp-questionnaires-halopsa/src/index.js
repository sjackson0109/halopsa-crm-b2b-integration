#!/usr/bin/env node

import { loadConfig } from './config.js';
import { sleep } from './http.js';
import { WpqClient } from './wpq-client.js';
import { HaloClient } from './halo-client.js';
import { WpqHaloSync } from './sync.js';

async function main() {
  const config = loadConfig();
  const sync = new WpqHaloSync({
    wpqClient: new WpqClient(config.wpq),
    haloClient: new HaloClient(config.halo),
    config
  });

  if (config.runtime.dryRun) {
    console.warn('Running in dry-run mode. No HaloPSA or WPQ mutation calls will be made.');
  }

  do {
    const result = await sync.runOnce();
    console.log(JSON.stringify(result, null, 2));

    if (config.runtime.once) break;
    await sleep(config.runtime.pollIntervalSeconds * 1000);
  } while (true);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
