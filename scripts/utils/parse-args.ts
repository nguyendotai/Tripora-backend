export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eqIndex = raw.indexOf('=');
    if (eqIndex === -1) {
      args[raw.slice(2)] = true;
    } else {
      args[raw.slice(2, eqIndex)] = raw.slice(eqIndex + 1);
    }
  }

  return args;
}
