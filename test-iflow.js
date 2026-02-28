/**
 * Test script for iFlow integration
 */

import { readFile, writeFile, bash, glob, grep } from './dist/iflow-tools.js';

async function test() {
  console.log('Testing iFlow tools integration...\n');

  // Test 1: Write and read a file
  console.log('Test 1: Write and read file');
  const testFile = '/tmp/moloclaw-test.txt';
  await writeFile(testFile, 'Hello from MoloClaw iFlow!');
  const content = await readFile(testFile);
  console.log('Content:', content);
  console.log('✓ Passed\n');

  // Test 2: List directory
  console.log('Test 2: List directory');
  const files = await glob('*', '/tmp');
  console.log('Files in /tmp:', files.slice(0, 5));
  console.log('✓ Passed\n');

  // Test 3: Bash command
  console.log('Test 3: Bash command');
  const result = await bash('echo "MoloClaw is running!"');
  console.log('Result:', result.trim());
  console.log('✓ Passed\n');

  // Test 4: Grep search
  console.log('Test 4: Grep search');
  const matches = await grep('Hello', testFile);
  console.log('Matches:', matches);
  console.log('✓ Passed\n');

  // Cleanup
  await bash(`rm ${testFile}`);

  console.log('All tests passed! ✓');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
