const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

function redirectUri(): string {
  return window.location.origin + "/callback";
}

export function loginUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri(),
    identity_provider: "Google",
  });
  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export function logoutUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: window.location.origin,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token: string;
  refresh_token?: string;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code,
    redirect_uri: redirectUri(),
  });

  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

const ACCESS_TOKEN_KEY = "cometranqui_access_token";
const ID_TOKEN_KEY = "cometranqui_id_token";

export function saveAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveIdToken(token: string) {
  sessionStorage.setItem(ID_TOKEN_KEY, token);
}

export function getIdToken(): string | null {
  return sessionStorage.getItem(ID_TOKEN_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ID_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}

export type UserProfile = {
  name?: string;
  email?: string;
  picture?: string;
  /** Grupos de Cognito (cognito:groups). "admin" habilita la administración de mensajería. */
  grupos: string[];
};

export const esAdmin = (perfil: UserProfile | null) => perfil?.grupos.includes("admin") ?? false;

export function getUserProfile(): UserProfile | null {
  const idToken = getIdToken();
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(decodeURIComponent(escape(json)));
    return {
      name: claims.name,
      email: claims.email,
      picture: claims.picture,
      grupos: Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [],
    };
  } catch {
    return null;
  }
}
