import { apiClient } from './api';

/**
 * Base service with injected API client.
 * Tüm domain servisleri bu siniftan turetilir.
 * Test yazarken apiClient mock'lanabilir.
 */
export class BaseService {
  protected readonly api: typeof apiClient;

  constructor(client: typeof apiClient = apiClient) {
    this.api = client;
  }
}
