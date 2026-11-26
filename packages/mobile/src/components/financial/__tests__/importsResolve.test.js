// Guards against "Element type is invalid" crashes: every relative import in the
// finance screens and modals must point at an export that actually exists
// (e.g. a default import of a module that only has named exports).
const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');

const SRC = path.join(__dirname, '..', '..', '..');
const FILES = [
  'screens/FinancesScreen.js',
  'screens/BankAccountDetailScreen.js',
  'screens/CardDetailScreen.js',
  'screens/BillsScreen.js',
  'screens/ClosingScreen.js',
  'screens/InvestmentsScreen.js',
  'components/modals/BillModal.js',
  'components/financial/InvestmentModal.js',
  'components/financial/MarkBillAsPaidModal.js',
  'components/financial/MemberDetailsModal.js',
  'components/financial/PaymentAllocationModal.js',
  'components/financial/CardInvoiceModal.js',
  'components/financial/CommittedMonthsCard.js',
  'components/financial/ZulEmptyState.js',
];

function parseFile(file) {
  return parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
}

function resolve(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  return [base, `${base}.js`, path.join(base, 'index.js')].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}

function exportsOf(file) {
  const names = new Set();
  let hasDefault = false;
  for (const node of parseFile(file).program.body) {
    if (node.type === 'ExportDefaultDeclaration') hasDefault = true;
    if (node.type === 'ExportAllDeclaration') names.add('*');
    if (node.type === 'ExportNamedDeclaration') {
      const decl = node.declaration;
      if (decl && decl.id) names.add(decl.id.name);
      if (decl && decl.declarations) decl.declarations.forEach((d) => d.id.name && names.add(d.id.name));
      (node.specifiers || []).forEach((s) => {
        const exported = s.exported.name || s.exported.value;
        if (exported === 'default') hasDefault = true;
        else names.add(exported);
      });
    }
  }
  return { names, hasDefault };
}

describe('finance screens import things that exist', () => {
  it.each(FILES)('%s', (rel) => {
    const file = path.join(SRC, rel);
    const problems = [];
    for (const node of parseFile(file).program.body) {
      if (node.type !== 'ImportDeclaration' || !node.source.value.startsWith('.')) continue;
      const target = resolve(file, node.source.value);
      if (!target) {
        problems.push(`cannot resolve ${node.source.value}`);
        continue;
      }
      const { names, hasDefault } = exportsOf(target);
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportDefaultSpecifier' && !hasDefault) {
          problems.push(`${node.source.value} has no default export`);
        }
        if (spec.type === 'ImportSpecifier' && !names.has(spec.imported.name) && !names.has('*')) {
          problems.push(`${node.source.value} has no export "${spec.imported.name}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
