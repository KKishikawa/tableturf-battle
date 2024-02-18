/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * This script merges the coverage reports from Cypress and Jest into a single one,
 * inside the "coverage" folder
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');

const NYC_OUTPUT_FOLDER = '.nyc_output';
const FINAL_OUTPUT_FOLDER = 'coverage';

const run = (commands) => {
  commands.forEach((command) => execSync(command, { stdio: 'inherit' }));
};

// Create the reports folder and move the reports from cypress and jest inside it
fs.emptyDirSync(NYC_OUTPUT_FOLDER);
fs.readdirSync('playwright-coverage', { withFileTypes: true }).forEach((file) => {
  if (file.isFile) {
    fs.copyFileSync(`playwright-coverage/${file.name}`, `${NYC_OUTPUT_FOLDER}/${file.name}`);
  }
});
fs.copyFileSync('vitest-coverage/coverage-final.json', `${NYC_OUTPUT_FOLDER}/from-vitest.json`);

fs.emptyDirSync(FINAL_OUTPUT_FOLDER);

// Run "nyc merge" inside the reports folder, merging the two coverage files into one,
// then generate the final report on the coverage folder
run([
  // "nyc merge" will create a "coverage.json" file on the root, we move it to .nyc_output
  // `npx nyc merge ${REPORTS_FOLDER} && mv coverage.json .nyc_output/out.json`,
  `npx nyc report --reporter=cobertura  --report-dir=${FINAL_OUTPUT_FOLDER}`,
]);
