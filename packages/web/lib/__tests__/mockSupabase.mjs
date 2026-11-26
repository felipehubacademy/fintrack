/**
 * Minimal chainable Supabase client mock for node:test.
 *
 * createMockSupabase({ resolve, users, rpc, deleteUser }):
 * - resolve(op) returns { data, error, count } for a query, where
 *   op = { table, action, filters: [[method, column, value]], values }.
 * - users maps access token -> auth user (for auth.getUser).
 * Every query is recorded in client.calls; rpc/auth calls too.
 */

const CHAIN = ['select', 'eq', 'neq', 'ilike', 'in', 'is', 'gt', 'lt', 'or', 'order', 'limit', 'range'];

export function createMockSupabase({ resolve = () => ({ data: [], error: null }), users = {}, rpc, deleteUser } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      const op = { table, action: 'select', filters: [], values: null };
      calls.push(op);
      const builder = {
        then(onFulfilled, onRejected) {
          return Promise.resolve(resolve(op)).then(onFulfilled, onRejected);
        },
        maybeSingle() {
          op.single = 'maybe';
          return builder;
        },
        single() {
          op.single = 'single';
          return builder;
        },
        update(values) {
          op.action = 'update';
          op.values = values;
          return builder;
        },
        insert(values) {
          op.action = 'insert';
          op.values = values;
          return builder;
        },
        delete() {
          op.action = 'delete';
          return builder;
        },
      };
      for (const method of CHAIN) {
        builder[method] = (column, value) => {
          if (method !== 'select' || op.action === 'select') op.filters.push([method, column, value]);
          return builder;
        };
      }
      return builder;
    },
    async rpc(name, params) {
      calls.push({ rpc: name, params });
      return rpc ? rpc(name, params) : { data: null, error: null };
    },
    auth: {
      async getUser(token) {
        const user = users[token];
        return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'invalid' } };
      },
      admin: {
        async deleteUser(id) {
          calls.push({ deleteUser: id });
          return deleteUser ? deleteUser(id) : { data: {}, error: null };
        },
      },
    },
  };
  return client;
}

export function filterValue(op, method, column) {
  const hit = op.filters.find(([m, c]) => m === method && c === column);
  return hit ? hit[2] : undefined;
}

export function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = value;
    },
  };
  return res;
}
