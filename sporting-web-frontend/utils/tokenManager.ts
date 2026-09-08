export interface SavedAccount {
  username: string;
  token: string;
  isActive: boolean;
}

/**
 * Parses JWT token payload to extract username.
 */
function getUsernameFromJwt(token: string): string | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      if (parsed && typeof parsed.username === 'string' && parsed.username.trim().length > 0) {
        return parsed.username.trim();
      }
    }
  } catch {
  }
  return null;
}

export const tokenManager = {
  /**
   * Dispatches custom events to notify all React components of account list changes.
   */
  notifyAccountsChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sporting_accounts_changed'));
    }
  },

  /**
   * Get dictionary of all logged-in account tokens from localStorage.
   * Uses JWT payload username whenever possible to guarantee token accuracy.
   */
  getAccountMap(): Record<string, string> {
    try {
      const raw = localStorage.getItem('access_token');
      if (!raw) return {};

      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const cleanMap: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (k && typeof v === 'string' && v.trim().length > 0) {
              const jwtUser = getUsernameFromJwt(v.trim());
              const finalKey = jwtUser || k.trim();
              cleanMap[finalKey] = v.trim();
            }
          }
          return cleanMap;
        }
      } else if (trimmed.length > 0) {
        const jwtUser = getUsernameFromJwt(trimmed);
        const activeUser = jwtUser || sessionStorage.getItem('active_username') || 'user';
        const map: Record<string, string> = { [activeUser]: trimmed };
        localStorage.setItem('access_token', JSON.stringify(map));
        return map;
      }
    } catch (e) {
      console.error('Failed to parse access_token map from localStorage', e);
    }
    return {};
  },

  /**
   * Get dictionary of refresh tokens from localStorage.
   */
  getRefreshTokenMap(): Record<string, string> {
    try {
      const raw = localStorage.getItem('refresh_token');
      if (!raw) return {};
      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse refresh_token map from localStorage', e);
    }
    return {};
  },

  /**
   * Retrieves active account refresh_token for current session/user.
   */
  getActiveRefreshToken(): string | null {
    const sessionRf = sessionStorage.getItem('refresh_token');
    if (sessionRf && sessionRf.trim().length > 0) {
      return sessionRf.trim();
    }

    const activeUser = this.getActiveUsername();
    if (activeUser) {
      const rfMap = this.getRefreshTokenMap();
      const lowerActive = activeUser.trim().toLowerCase();
      for (const [uname, tkn] of Object.entries(rfMap)) {
        if (uname.toLowerCase() === lowerActive && typeof tkn === 'string' && tkn.trim().length > 0) {
          sessionStorage.setItem('refresh_token', tkn.trim());
          return tkn.trim();
        }
      }
    }
    return null;
  },

  /**
   * Save or update an account token (and optional refresh_token) in localStorage map & set active session.
   */
  saveAccountToken(username: string, token: string, refreshToken?: string): void {
    if (!token || typeof token !== 'string') return;
    const cleanToken = token.trim();
    if (!cleanToken) return;

    const jwtUsername = getUsernameFromJwt(cleanToken);
    const cleanUsername = (jwtUsername || username || '').trim();
    if (!cleanUsername) return;

    const map = this.getAccountMap();
    map[cleanUsername] = cleanToken;

    try {
      localStorage.setItem('access_token', JSON.stringify(map));
    } catch (e) {
      console.error('Failed to save access_token map to localStorage', e);
    }

    if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
      const cleanRf = refreshToken.trim();
      const rfMap = this.getRefreshTokenMap();
      rfMap[cleanUsername] = cleanRf;
      try {
        localStorage.setItem('refresh_token', JSON.stringify(rfMap));
        sessionStorage.setItem('refresh_token', cleanRf);
      } catch (e) {
        console.error('Failed to save refresh_token map to localStorage', e);
      }
    }

    try {
      sessionStorage.setItem('access_token', cleanToken);
      sessionStorage.setItem('active_username', cleanUsername);
      sessionStorage.removeItem('tab_logged_out');
    } catch (e) {
      console.error('Failed to save session to sessionStorage', e);
    }

    this.notifyAccountsChanged();
  },

  /**
   * Remove a specific account token from localStorage map (only when user explicitly deletes an account)
   */
  removeAccountToken(username: string): void {
    if (!username) return;
    const cleanUsername = username.trim();
    const map = this.getAccountMap();
    const lowerClean = cleanUsername.toLowerCase();

    let changed = false;
    for (const [k, tokenVal] of Object.entries(map)) {
      const jwtUser = getUsernameFromJwt(String(tokenVal));
      if (
        k.toLowerCase() === lowerClean ||
        (jwtUser && jwtUser.toLowerCase() === lowerClean)
      ) {
        delete map[k];
        changed = true;
      }
    }

    if (changed) {
      if (Object.keys(map).length > 0) {
        localStorage.setItem('access_token', JSON.stringify(map));
      } else {
        localStorage.removeItem('access_token');
      }
    }

    const rfMap = this.getRefreshTokenMap();
    let rfChanged = false;
    for (const k of Object.keys(rfMap)) {
      if (k.toLowerCase() === lowerClean) {
        delete rfMap[k];
        rfChanged = true;
      }
    }
    if (rfChanged) {
      if (Object.keys(rfMap).length > 0) {
        localStorage.setItem('refresh_token', JSON.stringify(rfMap));
      } else {
        localStorage.removeItem('refresh_token');
      }
    }

    const activeUser = sessionStorage.getItem('active_username');
    const activeToken = sessionStorage.getItem('access_token');
    const activeJwtUser = activeToken ? getUsernameFromJwt(activeToken) : null;

    if (
      (activeUser && activeUser.trim().toLowerCase() === lowerClean) ||
      (activeJwtUser && activeJwtUser.toLowerCase() === lowerClean)
    ) {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('active_username');
      sessionStorage.setItem('tab_logged_out', 'true');
    }

    this.notifyAccountsChanged();
  },

  /**
   * Retrieves current active account authorization token.
   */
  getActiveToken(): string | null {
    if (typeof window !== 'undefined' && window.location && window.location.search.includes('switch_account')) {
      this.initTabSessionFromUrl();
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem('tab_logged_out') === 'true') {
      return null;
    }

    const map = this.getAccountMap();

    if (Object.keys(map).length === 0) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('active_username');
      }
      return null;
    }

    const sessionToken = sessionStorage.getItem('access_token');
    const activeUsername = sessionStorage.getItem('active_username');

    if (sessionToken && sessionToken.trim().length > 0) {
      const cleanSessionToken = sessionToken.trim();
      let isValidInLocalStorage = false;

      for (const [uname, tkn] of Object.entries(map)) {
        if (
          tkn === cleanSessionToken ||
          (activeUsername && uname.toLowerCase() === activeUsername.trim().toLowerCase())
        ) {
          isValidInLocalStorage = true;
          break;
        }
      }

      if (isValidInLocalStorage) {
        return cleanSessionToken;
      }
    }

    if (activeUsername) {
      const lowerActive = activeUsername.trim().toLowerCase();
      for (const [uname, tkn] of Object.entries(map)) {
        if (uname.toLowerCase() === lowerActive && typeof tkn === 'string' && tkn.trim().length > 0) {
          sessionStorage.setItem('access_token', tkn);
          return tkn;
        }
      }
    }

    const usernames = Object.keys(map);
    if (usernames.length > 0) {
      const activeUser = usernames[0];
      const activeToken = map[activeUser];
      if (typeof activeToken === 'string' && activeToken.trim().length > 0) {
        sessionStorage.setItem('access_token', activeToken);
        sessionStorage.setItem('active_username', activeUser);
        const rfMap = this.getRefreshTokenMap();
        if (rfMap[activeUser]) {
          sessionStorage.setItem('refresh_token', rfMap[activeUser]);
        } else {
          sessionStorage.removeItem('refresh_token');
        }
        return activeToken;
      }
    }

    return null;
  },

  /**
   * Get active username for current browser tab
   */
  getActiveUsername(): string | null {
    const activeUser = sessionStorage.getItem('active_username');
    if (activeUser && activeUser.trim().length > 0) {
      const cleanUser = activeUser.trim();
      const map = this.getAccountMap();
      const lowerUser = cleanUser.toLowerCase();
      const exists = Object.keys(map).some((k) => k.toLowerCase() === lowerUser);
      if (exists) {
        return cleanUser;
      }
    }

    const token = this.getActiveToken();
    if (!token) return null;

    const jwtUser = getUsernameFromJwt(token);
    if (jwtUser) {
      sessionStorage.setItem('active_username', jwtUser);
      return jwtUser;
    }

    const map = this.getAccountMap();
    for (const [uname, tkn] of Object.entries(map)) {
      if (tkn === token) {
        sessionStorage.setItem('active_username', uname);
        return uname;
      }
    }

    return null;
  },

  /**
   * Update or sync active account username in localStorage map & sessionStorage
   */
  updateActiveUsername(realUsername: string): void {
    if (!realUsername) return;
    const clean = realUsername.trim();
    const token = this.getActiveToken();
    if (!token) return;

    const jwtUser = getUsernameFromJwt(token);
    const targetUser = jwtUser || clean;

    const map = this.getAccountMap();
    map[targetUser] = token;

    try {
      localStorage.setItem('access_token', JSON.stringify(map));
    } catch (e) {
      console.error('Failed to update access_token map in localStorage', e);
    }

    try {
      sessionStorage.setItem('active_username', targetUser);
    } catch (e) {
      console.error('Failed to update active_username in sessionStorage', e);
    }
  },

  /**
   * Get array of all saved accounts in localStorage with active state for current tab
   */
  getAllAccounts(): SavedAccount[] {
    const map = this.getAccountMap();
    const activeUsername = this.getActiveUsername();

    return Object.entries(map).map(([username, token]) => ({
      username,
      token: String(token),
      isActive: username === activeUsername,
    }));
  },

  /**
   * Open a new browser tab for a specified account with its dedicated session token
   */
  switchAccountInNewTab(username: string): void {
    const targetUrl = `${window.location.origin}/?switch_account=${encodeURIComponent(username)}`;
    window.open(targetUrl, '_blank');
  },

  /**
   * Switch active account in the current browser tab
   */
  switchAccountInSameTab(username: string): void {
    if (!username) return;
    const clean = username.trim();
    const map = this.getAccountMap();
    const token = map[clean];
    if (token) {
      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('active_username', clean);
      sessionStorage.removeItem('tab_logged_out');
      this.notifyAccountsChanged();
      window.location.reload();
    }
  },

  /**
   * Initialize tab session from URL parameters (e.g. ?switch_account=username)
   */
  initTabSessionFromUrl(): void {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const switchAccount = urlParams.get('switch_account');
      if (switchAccount) {
        const map = this.getAccountMap();
        const token = map[switchAccount];
        if (token) {
          sessionStorage.setItem('access_token', token);
          sessionStorage.setItem('active_username', switchAccount);
          sessionStorage.removeItem('tab_logged_out');

          urlParams.delete('switch_account');
          const newSearch = urlParams.toString();
          const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        }
      }
    } catch (e) {
      console.error('Failed to init tab session from URL', e);
    }
  },

  /**
   * Clear active account session and delete its key and token completely from localStorage on logout
   */
  clearTabSession(username?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const activeToken = sessionStorage.getItem('access_token');
      const activeUsername = sessionStorage.getItem('active_username');

      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('active_username');
      sessionStorage.setItem('tab_logged_out', 'true');
      localStorage.removeItem('sporting_gps_full_address');

      let targetUser = (username || activeUsername || '').trim();
      if (!targetUser && activeToken) {
        targetUser = (getUsernameFromJwt(activeToken) || '').trim();
      }

      const map = this.getAccountMap();
      let changed = false;

      if (targetUser) {
        const lowerTarget = targetUser.toLowerCase();
        for (const k of Object.keys(map)) {
          if (k.toLowerCase() === lowerTarget) {
            delete map[k];
            changed = true;
          }
        }
      }

      if (activeToken) {
        const cleanToken = activeToken.trim();
        for (const [k, v] of Object.entries(map)) {
          if (v && typeof v === 'string' && v.trim() === cleanToken) {
            delete map[k];
            changed = true;
          }
        }
      }

      if (!targetUser && !activeToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        changed = true;
      } else if (changed) {
        if (Object.keys(map).length > 0) {
          localStorage.setItem('access_token', JSON.stringify(map));
        } else {
          localStorage.removeItem('access_token');
        }
      }

      const rfMap = this.getRefreshTokenMap();
      let rfChanged = false;
      if (targetUser) {
        const lowerTarget = targetUser.toLowerCase();
        for (const k of Object.keys(rfMap)) {
          if (k.toLowerCase() === lowerTarget) {
            delete rfMap[k];
            rfChanged = true;
          }
        }
      }
      if (rfChanged) {
        if (Object.keys(rfMap).length > 0) {
          localStorage.setItem('refresh_token', JSON.stringify(rfMap));
        } else {
          localStorage.removeItem('refresh_token');
        }
      }

      this.notifyAccountsChanged();
    } catch (e) {
      console.error('Failed to clear tab session', e);
    }
  },

  /**
   * Handle logout/deletion of active account: if other accounts exist in localStorage,
   * try closing the current tab or automatically switch to the first remaining account.
   * If no other accounts exist, execute fallback logout callback (redirecting to /login).
   */
  handleActiveLogoutOrAutoSwitch(currentUsername?: string, onLogoutFallback?: () => void): void {
    const targetUser = (currentUsername || sessionStorage.getItem('active_username') || '').trim();
    if (targetUser) {
      this.removeAccountToken(targetUser);
    } else {
      this.clearTabSession();
    }

    const remaining = this.getAllAccounts();
    if (remaining.length > 0) {
      const firstAcc = remaining[0].username;
      this.switchAccountInSameTab(firstAcc);
    } else {
      if (onLogoutFallback) {
        onLogoutFallback();
      }
    }
  },
};

