export type CallDirection = "INBOUND" | "OUTBOUND";
export type CallStatus =
  | "RINGING"
  | "ANSWERED"
  | "COMPLETED"
  | "MISSED"
  | "BUSY"
  | "FAILED";

export type CallsSortField =
  | "startedAt"
  | "durationSeconds"
  | "status"
  | "direction";
export type CallsSortDir = "asc" | "desc";

export interface ListCallsFilters {
  extensionId?: string;
  direction?: CallDirection;
  contactId?: string;
  status?: CallStatus;
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  sortBy?: CallsSortField;
  sortDir?: CallsSortDir;
  page?: number;
  perPage?: number;
}

export interface CallRecord {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  phone: string;
  durationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  recordUrl: string | null;
  contactId: string | null;
  dealId: string | null;
  extensionId: string | null;
  contact?: { id: string; name: string | null; phone: string | null } | null;
}

export interface ListCallsResponse {
  calls: CallRecord[];
  total: number;
  page: number;
  perPage: number;
}

export interface DialApi4ComContext {
  dealId?: string;
  contactId?: string;
}

export interface SipCredentials {
  sipUri: string;
  authUser: string;
  authPassword: string;
  wsServer: string;
  stunServers: string[];
  turnServer: {
    urls: string;
    username?: string;
    credential?: string;
  } | null;
}

export interface SipExtension {
  id: string;
  label: string;
  sipUri: string;
  authUser: string;
  wsServer: string;
  status: string;
  userId: string;
}
