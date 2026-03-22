import { Command } from 'commander';
import { loadConfig } from '../config.js';
async function api(path, query) {
    const { serverUrl, apiKey } = loadConfig();
    const url = new URL(`${serverUrl}${path}`);
    if (query)
        Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json.error ?? `Server returned ${res.status}`);
    return json;
}
export const auditCmd = new Command('audit')
    .description('View the audit log')
    .option('--machine-id <id>', 'Filter by machine ID')
    .option('--action <action>', 'Filter by action type (e.g. SECRET_FETCHED)')
    .option('--limit <n>', 'Maximum number of entries', '50')
    .action(async (opts) => {
    try {
        const query = { limit: opts.limit };
        if (opts.machineId)
            query.machine_id = opts.machineId;
        if (opts.action)
            query.action = opts.action;
        const result = await api('/audit', query);
        const entries = result.entries;
        if (entries.length === 0) {
            console.log('No audit entries found.');
            return;
        }
        console.log(`\n${'TIMESTAMP'.padEnd(24)} ${'ACTION'.padEnd(22)} ${'OK'.padEnd(5)} ${'MACHINE ID'.padEnd(38)} IP`);
        console.log('-'.repeat(110));
        for (const e of entries) {
            const ts = new Date(e.timestamp).toLocaleString();
            const ok = e.success ? '✓' : '✗';
            const machine = e.machineId ?? '—';
            const ip = e.ipAddress ?? '—';
            console.log(`${ts.padEnd(24)} ${e.action.padEnd(22)} ${ok.padEnd(5)} ${machine.padEnd(38)} ${ip}`);
        }
        console.log(`\n${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}\n`);
    }
    catch (err) {
        console.error(`✗ ${err.message}`);
        process.exit(1);
    }
});
