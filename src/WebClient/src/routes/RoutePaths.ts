export type Id = string | number;

export const RoutePaths = {
  // Auth
  login: (): string => "/",
  registration: (): string => "/registration",

  // User-facing
  home: (): string => "/home",
  myProfile: (): string => "/my-profile",
  chats: (): string => "/chats",
  chatSignalR: (id: Id): string => `/chatSignalR/${id}`,
  chatWS: (id: Id): string => `/chatWS/${id}`,
  chatPolling: (id: Id): string => `/chatPolling/${id}`,
  chatSSE: (id: Id): string => `/chatSSE/${id}`,
  chatSocketIO: (id: Id): string => `/chatSocketIO/${id}`,
  community: (): string => "/community",
  myFriends: (): string => "/my-friends",
  support: (): string => "/support",

  // Admin
  adminDashboard: (): string => "/admin/dashboard",
  adminUsers: (): string => "/admin/users",
  adminChats: (): string => "/admin/chats",
  adminChat: (id: Id): string => `/admin/chat/${id}`,
  adminSupport: (): string => "/admin/support",
  adminCommunicationTechnologies: (): string => "/admin/communication-technologies",
  adminMakeAnAdmin: (): string => "/admin/make-admin",
  adminRaportsUsers: (): string => "/admin/raports/users",
  adminRaportsChats: (): string => "/admin/raports/chats",
} as const;

// Route patterns for react-router route declarations (with params)
export const RoutePatterns = {
  chatSignalR: "/chatSignalR/:id",
  chatWS: "/chatWS/:id",
  chatPolling: "/chatPolling/:id",
  chatSSE: "/chatSSE/:id",
  chatSocketIO: "/chatSocketIO/:id",
  adminChat: "/admin/chat/:id",
} as const;

// Helper to append query parameters consistently
export function withQuery(path: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return path;
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    usp.append(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
}

export type RoutePathsType = typeof RoutePaths;
export type RoutePatternsType = typeof RoutePatterns;