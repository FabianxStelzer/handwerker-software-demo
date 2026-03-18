/**
 * GoCardless Bank Account Data API client.
 * Uses the free Open Banking API (formerly Nordigen) for bank account access.
 * Docs: https://developer.gocardless.com/bank-account-data/quick-start-guide
 */

const BASE_URL = "https://bankaccountdata.gocardless.com/api/v2";

let cachedToken: { access: string; expiresAt: number } | null = null;

export async function getAccessToken(secretId: string, secretKey: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.access;
  }

  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GoCardless token error ${res.status}: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    access: data.access,
    expiresAt: Date.now() + (data.access_expires ?? 86400) * 1000,
  };
  return cachedToken.access;
}

export interface Institution {
  id: string;
  name: string;
  bic: string;
  logo: string;
  countries: string[];
  transaction_total_days: string;
}

export async function getInstitutions(token: string, country = "DE"): Promise<Institution[]> {
  const res = await fetch(`${BASE_URL}/institutions/?country=${country}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Institutions error ${res.status}`);
  return res.json();
}

export interface Requisition {
  id: string;
  status: string;
  institution_id: string;
  link: string;
  accounts: string[];
  redirect: string;
  reference: string;
}

export async function createRequisition(
  token: string,
  institutionId: string,
  redirectUrl: string,
  reference: string,
): Promise<Requisition> {
  const res = await fetch(`${BASE_URL}/requisitions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      redirect: redirectUrl,
      institution_id: institutionId,
      reference,
      user_language: "DE",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Requisition error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getRequisition(token: string, requisitionId: string): Promise<Requisition> {
  const res = await fetch(`${BASE_URL}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Requisition fetch error ${res.status}`);
  return res.json();
}

export async function deleteRequisition(token: string, requisitionId: string): Promise<void> {
  await fetch(`${BASE_URL}/requisitions/${requisitionId}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
}

export interface AccountDetails {
  iban?: string;
  name?: string;
  ownerName?: string;
  currency?: string;
  product?: string;
}

export async function getAccountDetails(token: string, accountId: string): Promise<AccountDetails> {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/details/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Account details error ${res.status}`);
  const data = await res.json();
  return data.account || data;
}

export interface Balance {
  balanceAmount: { amount: string; currency: string };
  balanceType: string;
}

export async function getAccountBalances(token: string, accountId: string): Promise<Balance[]> {
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/balances/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Balances error ${res.status}`);
  const data = await res.json();
  return data.balances || [];
}

export interface Transaction {
  transactionId?: string;
  bookingDate: string;
  valueDate?: string;
  transactionAmount: { amount: string; currency: string };
  debtorName?: string;
  creditorName?: string;
  remittanceInformationUnstructured?: string;
}

export async function getAccountTransactions(
  token: string,
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ booked: Transaction[]; pending: Transaction[] }> {
  let url = `${BASE_URL}/accounts/${accountId}/transactions/`;
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  if (params.toString()) url += `?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Transactions error ${res.status}`);
  const data = await res.json();
  return data.transactions || { booked: [], pending: [] };
}
