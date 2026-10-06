import { createApiClient } from '@facadeur/api-client';

/** Same-origin transport shared by editor features; business rules live in the API package. */
export const api = createApiClient();
