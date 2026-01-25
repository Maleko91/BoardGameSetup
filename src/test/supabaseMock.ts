import type { Session } from "@supabase/supabase-js";

type AuthChangeCallback = (event: string, session: Session | null) => void;

type QueryResponse = {
  data: unknown;
  error: { message: string } | null;
  count?: number;
};

type ResponseQueues = Record<string, Record<string, QueryResponse[]>>;
type PayloadQueues = Record<string, Record<string, unknown[]>>;

type SupabaseMockState = {
  ready: boolean;
  authSession: Session | null;
  authListeners: Set<AuthChangeCallback>;
  responses: ResponseQueues;
  payloads: PayloadQueues;
  client: SupabaseClientMock;
};

type QueryOp =
  | "select"
  | "maybeSingle"
  | "single"
  | "range"
  | "insert"
  | "update"
  | "delete";

type QueryBuilderMock = {
  select: () => QueryBuilderMock;
  insert: (payload: unknown) => QueryBuilderMock;
  update: (payload: unknown) => QueryBuilderMock;
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
  };
  from: (table: string) => QueryBuilderMock;
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

const ensureQueue = (state: SupabaseMockState, table: string, op: QueryOp) => {
  if (!state.responses[table]) {
    state.responses[table] = {};
  }
  if (!state.responses[table][op]) {
    state.responses[table][op] = [];
  }
  return state.responses[table][op];
};

const recordPayload = (
  state: SupabaseMockState,
  table: string,
  op: "insert" | "update",
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
    }
  },
  from: (table) => createQueryBuilder(state, table)
});

export const supabaseMockState: SupabaseMockState = {
  ready: false,
  authSession: null,
  authListeners: new Set(),
  responses: {},
  payloads: {},
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
  emitAuthChange: (event: string, session: Session | null) => {
    supabaseMockState.authSession = session;
    supabaseMockState.authListeners.forEach((callback) =>
      callback(event, session)
    );
  },
  getLastPayload: (table: string, op: "insert" | "update") => {
    const payloads = supabaseMockState.payloads[table]?.[op];
    if (!payloads || !payloads.length) {
      return undefined;
    }
    return payloads[payloads.length - 1];
  }
};
