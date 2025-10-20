// GraphQL client for Sleeper API

import { getAccessToken, isTokenExpired, clearAuthData } from '../utils/tokenStorage';

// Use a same-origin proxy path in dev to avoid cross-site CORS preflights
// Vite dev server proxies this path to https://sleeper.com/graphql
const GRAPHQL_ENDPOINT = '/api/sleeper/graphql';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Execute a GraphQL query against Sleeper's API
 */
export async function sleeperGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<GraphQLResponse<T>> {
  // Check if token is expired
  if (isTokenExpired()) {
    // TODO: Implement token refresh logic
    console.warn('Token expired, user needs to re-authenticate');
    clearAuthData();
    throw new Error('Authentication expired. Please log in again.');
  }

  const token = getAccessToken();
  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  try {
    const body: any = { query };
    if (variables && Object.keys(variables).length > 0) {
      body.variables = variables;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // IMPORTANT: Sleeper expects the raw JWT in Authorization (no "Bearer ")
        'Authorization': token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthData();
        throw new Error('Authentication failed. Please log in again.');
      }
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0].message);
    }

    return result;
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw error;
  }
}

/**
 * Helper to make GraphQL queries more convenient
 */
export async function query<T = any>(
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  const result = await sleeperGraphQL<T>(queryString, variables);
  if (!result.data) {
    throw new Error('No data returned from GraphQL query');
  }
  return result.data;
}

/**
 * Helper for GraphQL mutations
 */
export async function mutate<T = any>(
  mutation: string,
  variables?: Record<string, any>
): Promise<T> {
  const result = await sleeperGraphQL<T>(mutation, variables);
  if (!result.data) {
    throw new Error('No data returned from GraphQL mutation');
  }
  return result.data;
}
