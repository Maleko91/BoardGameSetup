import type { Session } from "@supabase/supabase-js";

type AuthChangeCallback = (event: string, session: Session | null) => void;

type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
  count?: number;
};

type ResponseQueues = Record<string, Record<string, QueryResponse[]>>;
type PayloadQueues = Record<string, Record<string, unknown[]>>;

type AuthOp =
  | "signInWithPassword"
  | "signUp"
  | "resetPasswordForEmail"
  | "updateUser"
  | "signOut";

type AuthResponse = {
  data?: { session?: Session | null } | null;
  error: { message: string } | null;
};

type AuthResponseQueues = Partial<Record<AuthOp, AuthResponse[]>>;
type RpcResponseQueues = Record<string, QueryResponse[]>;

type SupabaseMockState = {
  ready: boolean;
  authSession: Session | null;
  authListeners: Set<AuthChangeCallback>;
  responses: ResponseQueues;
  payloads: PayloadQueues;
  authResponses: AuthResponseQueues;
  rpcResponses: RpcResponseQueues;
  client: SupabaseClientMock;
};

type QueryOp =
  | "select"
  | "maybeSingle"
  | "single"
  | "range"
  | "insert"
  | "update"
  | "upsert"
  | "delete";

type QueryBuilderMock = {
  select: () => QueryBuilderMock;
  insert: (payload: unknown) => QueryBuilderMock;
  update: (payload: unknown) => QueryBuilderMock;
  upsert: (payload: unknown) => QueryBuilderMock;
  delete: () => QueryBuilderMock;
  eq: () => QueryBuilderMock;
  order: () => QueryBuilderMock;
  in: () => QueryBuilderMock;
  is: () => QueryBuilderMock;
  maybeSingle: () => Promise<QueryResponse>;
  single: () => Promise<QueryResponse>;
  range: () => Promise<QueryResponse>;
  then: <TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
};

type SupabaseClientMock = {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null }; error: null }>;
    onAuthStateChange: (
      callback: AuthChangeCallback
    ) => { data: { subscription: { unsubscribe: () => void } } };
    signInWithPassword: (payload: {
      email: string;
      password: string;
    }) => Promise<AuthResponse>;
    signUp: (payload: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => Promise<AuthResponse>;
    resetPasswordForEmail: (
      email: string,
      options?: { redirectTo?: string }
    ) => Promise<AuthResponse>;
    updateUser: (payload: unknown) => Promise<AuthResponse>;
    signOut: () => Promise<AuthResponse>;
  };
  from: (table: string) => QueryBuilderMock;
  rpc: (fn: string) => Promise<QueryResponse>;
};

const defaultResponse = (op: QueryOp): QueryResponse => {
  if (op === "range") {
    return { data: [], error: null, count: 0 };
  }
  if (op === "select") {
    return { data: [], error: null };
  }
  return { data: null, error: null };
};

const defaultAuthResponse = (op: AuthOp): AuthResponse => {
  if (op === "signUp" || op === "signInWithPassword") {
    return { data: { session: null }, error: null };
  }
  return { data: null, error: null };
};

const ensureQueue = (state: SupabaseMockState, table: string, op: QueryOp) => {
  if (!state.responses[table]) {
    state.responses[table] = {};
  }
  if (!state.responses[table][op]) {
    state.responses[table][op] = [];
  }
  return state.responses[table][op];
};

const ensureAuthQueue = (state: SupabaseMockState, op: AuthOp) => {
  if (!state.authResponses[op]) {
    state.authResponses[op] = [];
  }
  return state.authResponses[op]!;
};

const ensureRpcQueue = (state: SupabaseMockState, fn: string) => {
  if (!state.rpcResponses[fn]) {
    state.rpcResponses[fn] = [];
  }
  return state.rpcResponses[fn];
};

const recordPayload = (
  state: SupabaseMockState,
  table: string,
  op: "insert" | "update" | "upsert",
  payload: unknown
) => {
  if (!state.payloads[table]) {
    state.payloads[table] = {};
  }
  if (!state.payloads[table][op]) {
    state.payloads[table][op] = [];
  }
  state.payloads[table][op].push(payload);
};

const takeResponse = (
  state: SupabaseMockState,
  table: string,
  op: QueryOp
) => {
  const queue = ensureQueue(state, table, op);
  if (queue.length) {
    return queue.shift()!;
  }
  if (op !== "select") {
    const fallbackQueue = ensureQueue(state, table, "select");
    if (fallbackQueue.length) {
      return fallbackQueue.shift()!;
    }
  }
  return defaultResponse(op);
};

const takeAuthResponse = (state: SupabaseMockState, op: AuthOp) => {
  const queue = ensureAuthQueue(state, op);
  if (queue.length) {
    return queue.shift()!;
  }
  return defaultAuthResponse(op);
};

const takeRpcResponse = (state: SupabaseMockState, fn: string) => {
  const queue = ensureRpcQueue(state, fn);
  if (queue.length) {
    return queue.shift()!;
  }
  return { data: null, error: null };
};

const createQueryBuilder = (
  state: SupabaseMockState,
  table: string
): QueryBuilderMock => {
  let op: QueryOp = "select";
  const builder: QueryBuilderMock = {
    select: () => {
      op = "select";
      return builder;
    },
    insert: (payload) => {
      op = "insert";
      recordPayload(state, table, "insert", payload);
      return builder;
    },
    update: (payload) => {
      op = "update";
      recordPayload(state, table, "update", payload);
      return builder;
    },
    upsert: (payload) => {
      op = "upsert";
      recordPayload(state, table, "upsert", payload);
      return builder;
    },
    delete: () => {
      op = "delete";
      return builder;
    },
    eq: () => builder,
    order: () => builder,
    in: () => builder,
    is: () => builder,
    maybeSingle: () => Promise.resolve(takeResponse(state, table, "maybeSingle")),
    single: () => Promise.resolve(takeResponse(state, table, "single")),
    range: () => Promise.resolve(takeResponse(state, table, "range")),
    then: (onfulfilled, onrejected) =>
      Promise.resolve(takeResponse(state, table, op)).then(onfulfilled, onrejected)
  };
  return builder;
};

const createClient = (state: SupabaseMockState): SupabaseClientMock => ({
  auth: {
    getSession: async () => ({
      data: { session: state.authSession },
      error: null
    }),
    onAuthStateChange: (callback) => {
      state.authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => state.authListeners.delete(callback)
          }
        }
      };
    },
    signInWithPassword: async () => {
      const response = takeAuthResponse(state, "signInWithPassword");
      if (!response.error && response.data?.session) {
        state.authSession = response.data.session;
        state.authListeners.forEach((listener) =>
          listener("SIGNED_IN", response.data?.session ?? null)
        );
      }
      return response;
    },
    signUp: async () => {
      const response = takeAuthResponse(state, "signUp");
      if (!response.error && response.data?.session) {
        state.authSession = response.data.session;
        state.authListeners.forEach((listener) =>
          listener("SIGNED_UP", response.data?.session ?? null)
        );
      }
      return response;
    },
    resetPasswordForEmail: async () =>
      takeAuthResponse(state, "resetPasswordForEmail"),
    updateUser: async () => takeAuthResponse(state, "updateUser"),
    signOut: async () => {
      const response = takeAuthResponse(state, "signOut");
      if (!response.error) {
        state.authSession = null;
        state.authListeners.forEach((listener) => listener("SIGNED_OUT", null));
      }
      return response;
    }
  },
  from: (table) => createQueryBuilder(state, table),
  rpc: async (fn) => takeRpcResponse(state, fn)
});

export const supabaseMockState: SupabaseMockState = {
  ready: false,
  authSession: null,
  authListeners: new Set(),
  responses: {},
  payloads: {},
  authResponses: {},
  rpcResponses: {},
  client: {} as SupabaseClientMock
};

supabaseMockState.client = createClient(supabaseMockState);

(globalThis as { __supabaseMockState?: SupabaseMockState }).__supabaseMockState =
  supabaseMockState;

export const supabaseMock = {
  reset: () => {
    supabaseMockState.ready = false;
    supabaseMockState.authSession = null;
    supabaseMockState.authListeners.clear();
    supabaseMockState.responses = {};
    supabaseMockState.payloads = {};
    supabaseMockState.authResponses = {};
    supabaseMockState.rpcResponses = {};
  },
  setReady: (ready: boolean) => {
    supabaseMockState.ready = ready;
  },
  setSession: (session: Session | null) => {
    supabaseMockState.authSession = session;
  },
  enqueueResponse: (table: string, op: QueryOp, response: QueryResponse) => {
    ensureQueue(supabaseMockState, table, op).push(response);
  },
  setResponses: (table: string, op: QueryOp, responses: QueryResponse[]) => {
    if (!supabaseMockState.responses[table]) {
      supabaseMockState.responses[table] = {};
    }
    supabaseMockState.responses[table][op] = [...responses];
  },
  enqueueAuthResponse: (op: AuthOp, response: AuthResponse) => {
    ensureAuthQueue(supabaseMockState, op).push(response);
  },
  setAuthResponses: (op: AuthOp, responses: AuthResponse[]) => {
    supabaseMockState.authResponses[op] = [...responses];
  },
  enqueueRpcResponse: (fn: string, response: QueryResponse) => {
    ensureRpcQueue(supabaseMockState, fn).push(response);
  },
  setRpcResponses: (fn: string, responses: QueryResponse[]) => {
    supabaseMockState.rpcResponses[fn] = [...responses];
  },
  emitAuthChange: (event: string, session: Session | null) => {
    supabaseMockState.authSession = session;
    supabaseMockState.authListeners.forEach((callback) =>
      callback(event, session)
    );
  },
  getLastPayload: (table: string, op: "insert" | "update" | "upsert") => {
    const payloads = supabaseMockState.payloads[table]?.[op];
    if (!payloads || !payloads.length) {
      return undefined;
    }
    return payloads[payloads.length - 1];
  }
};
