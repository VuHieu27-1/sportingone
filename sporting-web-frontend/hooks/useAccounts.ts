import { useState, useEffect } from 'react';
import { tokenManager, SavedAccount } from '../utils/tokenManager';

export function useAccounts(): SavedAccount[] {
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => tokenManager.getAllAccounts());

  useEffect(() => {
    const handleAccountsChange = () => {
      setAccounts(tokenManager.getAllAccounts());
    };

    window.addEventListener('sporting_accounts_changed', handleAccountsChange);
    window.addEventListener('storage', handleAccountsChange);

    return () => {
      window.removeEventListener('sporting_accounts_changed', handleAccountsChange);
      window.removeEventListener('storage', handleAccountsChange);
    };
  }, []);

  return accounts;
}
