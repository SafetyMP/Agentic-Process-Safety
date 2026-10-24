import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, delimiter } from 'node:path';

type Agent = 'demand' | 'inventory' | 'supplier' | 'finance' | 'purchase';
type State = { version: number; demand: number; stock: number; quantity: number; supplier: string; quote: number; authorization: string; orders: string[] };
type Receipt = { schema_version: '1.0'; sandbox: true; state: State; events: { agent: Agent; tool: string; version: number }[] };

/** Phase 1-compatible client adapter. All mock execution is in the independent gateway process. */
export function simulate(options: { depth?: number; stock?: number; demand?: number; budget?: number; staleVersion?: boolean; supplierText?: string } = {}): Receipt {
  const depth = options.depth ?? 0;
  if (!Number.isInteger(depth) || depth < 0 || depth >= 3) throw new Error('Delegation depth exceeded');
  const stock = options.stock ?? 20, demand = options.demand ?? 100, budget = options.budget ?? 1000;
  if (![stock, demand, budget].every(x => Number.isSafeInteger(x) && x >= 0 && x <= 100000)) throw new Error('Invalid input bounds');
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const python = process.env.APS_PYTHON || resolve(root, '.venv/bin/python');
  const child = spawnSync(python, ['-m', 'aps_governance.demo', '--options', JSON.stringify(options)], {
    cwd: root, encoding: 'utf8', timeout: 15000,
    env: { ...process.env, PYTHONPATH: [resolve(root, 'packages/engine'), resolve(root, 'packages/governance')].join(delimiter) },
  });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(child.stderr.trim() || 'Governance gateway unavailable');
  // The trusted runner validates this response against the unchanged Phase 1 simulation schema.
  return JSON.parse(child.stdout) as Receipt;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(simulate(), null, 2));
