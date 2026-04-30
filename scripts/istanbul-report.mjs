import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const options = parseArgs(process.argv.slice(2));
const coverageFiles = await findCoverageFiles(options.tempDir);

if (coverageFiles.length === 0) {
  console.error(`No coverage JSON files found in ${options.tempDir}`);
  process.exitCode = 1;
} else {
  const coverageMap = createCoverageMap({});

  for (const coverageFile of coverageFiles) {
    const coverageJson = JSON.parse(await fs.readFile(coverageFile, 'utf8'));
    coverageMap.merge(createCoverageMap(coverageJson));
  }

  const context = createContext({
    dir: options.reportDir,
    coverageMap,
  });

  for (const reporter of options.reporters) {
    reports.create(reporter).execute(context);
  }
}

function parseArgs(args) {
  const options = {
    reporters: [],
    tempDir: 'playwright-coverage',
    reportDir: 'playwright-coverage',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inlineValue] = arg.split('=', 2);

    if (name === '--reporter') {
      options.reporters.push(inlineValue ?? args[++index]);
    } else if (name === '--temp-dir') {
      options.tempDir = inlineValue ?? args[++index];
    } else if (name === '--report-dir') {
      options.reportDir = inlineValue ?? args[++index];
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  if (options.reporters.length === 0) {
    options.reporters.push('lcov');
  }

  return options;
}

async function findCoverageFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findCoverageFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }

  return files;
}
