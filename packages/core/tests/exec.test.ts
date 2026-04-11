import { expect, test, describe } from 'bun:test';
import { runCommand } from '../src/utils/exec';

describe('runCommand', () => {
  test('returns stdout on success', async () => {
    const result = await runCommand('echo', ['hello']);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.exitCode).toBe(0);
  });

  test('returns stderr and non-zero exitCode on failure', async () => {
    const result = await runCommand('git', ['invalid-command-xyz']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  test('throws if command binary does not exist', async () => {
    await expect(runCommand('nonexistent-binary-xyz', [])).rejects.toThrow();
  });
});
