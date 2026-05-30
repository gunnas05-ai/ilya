/**
 * Admin API Integration Tests
 *
 * Calistirmak icin: backend calisiyor olmali (npm run start:dev)
 * Sonra: npx jest --config jest.config.js src/common/__tests__/admin-api.integration.spec.ts
 *
 * Bu testler gercek HTTP istekleri yapar — unit test degil, integration test.
 */
import axios from 'axios';

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}/api/v1`;
let adminToken = '';

// Test sirasinda olusan kaynaklari temizlemek icin
const createdIds: string[] = [];

async function adminLogin() {
  const res = await axios.post(`${BASE}/auth/login`, {
    email: 'admin@kaptan.com',
    password: 'admin123',
  }).catch(async () => {
    // Admin yoksa super_admin ile dene
    const r2 = await axios.post(`${BASE}/auth/login`, {
      email: 'super@kaptan.com',
      password: 'super123',
    });
    return r2;
  });
  adminToken = res.data?.data?.accessToken || res.data?.accessToken || '';
}

const auth = () => ({ Authorization: `Bearer ${adminToken}` });

describe('Admin API — Role & Permission CRUD', () => {
  beforeAll(async () => { await adminLogin(); }, 15000);

  it('GET /admin/roles — should list roles', async () => {
    const res = await axios.get(`${BASE}/admin/roles`, { headers: auth() });
    expect(res.status).toBe(200);
    expect(res.data?.success).toBe(true);
    expect(Array.isArray(res.data?.data)).toBe(true);
  });

  it('POST /admin/roles — should create a role', async () => {
    const res = await axios.post(`${BASE}/admin/roles`, {
      key: 'test_role_integration',
      label: 'Integration Test Role',
      description: 'Auto-created by integration test',
    }, { headers: auth() });
    expect(res.status).toBe(201);
    expect(res.data?.data?.key).toBe('test_role_integration');
    createdIds.push(res.data.data.id);
  });

  it('PUT /admin/roles/:id — should update a role', async () => {
    if (!createdIds[0]) return;
    const res = await axios.put(`${BASE}/admin/roles/${createdIds[0]}`, {
      label: 'Updated Integration Role',
    }, { headers: auth() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/roles/permissions — should list permissions', async () => {
    const res = await axios.get(`${BASE}/admin/roles/permissions`, { headers: auth() });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data?.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);
  });

  it('POST /admin/roles/permissions — should create a permission', async () => {
    const res = await axios.post(`${BASE}/admin/roles/permissions`, {
      key: 'test_perm_integration',
      label: 'Test Permission',
      group: 'Test',
    }, { headers: auth() });
    expect(res.status).toBe(201);
  });

  it('GET /admin/roles/templates/list — should list templates', async () => {
    const res = await axios.get(`${BASE}/admin/roles/templates/list`, { headers: auth() });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data?.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(8);
  });

  it('POST /admin/roles/permissions/clone — should clone permissions', async () => {
    const res = await axios.post(`${BASE}/admin/roles/permissions/clone`, {
      fromRoleKey: 'super_admin',
      toRoleKey: 'test_role_integration',
    }, { headers: auth() });
    expect(res.status).toBe(201);
  });

  afterAll(async () => {
    // Temizlik
    for (const id of createdIds) {
      await axios.delete(`${BASE}/admin/roles/${id}`, { headers: auth() }).catch(() => {});
    }
    await axios.delete(`${BASE}/admin/roles/permissions/test_perm_integration`, { headers: auth() }).catch(() => {});
  });
});

describe('Admin API — Test Center', () => {
  beforeAll(async () => { await adminLogin(); }, 15000);

  it('GET /admin/tests/stats — should return stats', async () => {
    const res = await axios.get(`${BASE}/admin/tests/stats`, { headers: auth() });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  });

  it('GET /admin/tests/health — should return health status', async () => {
    const res = await axios.get(`${BASE}/admin/tests/health`, { headers: auth() });
    expect(res.status).toBe(200);
    expect(res.data?.success).toBe(true);
  });

  it('POST /admin/tests/run/smoke — should run smoke tests', async () => {
    const res = await axios.post(`${BASE}/admin/tests/run/smoke`, {}, { headers: auth() });
    expect(res.status).toBe(201);
    expect(res.data?.data?.status).toBeDefined();
  }, 30000);

  it('GET /admin/tests/ai/analysis — should return AI analysis', async () => {
    const res = await axios.get(`${BASE}/admin/tests/ai/analysis`, { headers: auth() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/tests/system-info — should return system info', async () => {
    const res = await axios.get(`${BASE}/admin/tests/system-info`, { headers: auth() });
    expect(res.status).toBe(200);
    expect(res.data?.data?.uptime).toBeDefined();
    expect(res.data?.data?.nodeVersion).toBeDefined();
  });
});

describe('Admin API — Security & Audit', () => {
  beforeAll(async () => { await adminLogin(); }, 15000);

  it('GET /admin/security/audit-logs — should return logs', async () => {
    const res = await axios.get(`${BASE}/admin/security/audit-logs`, { headers: auth() });
    expect(res.status).toBe(200);
  });

  it('GET /admin/security/security-events — should return events', async () => {
    const res = await axios.get(`${BASE}/admin/security/security-events`, { headers: auth() });
    expect(res.status).toBe(200);
  });

  it('POST /admin/security/backup — should create backup', async () => {
    const res = await axios.post(`${BASE}/admin/security/backup`, {}, { headers: auth() });
    expect(res.status).toBe(201);
    expect(res.data?.success).toBe(true);
  });

  it('GET /admin/security/backups — should list backups', async () => {
    const res = await axios.get(`${BASE}/admin/security/backups`, { headers: auth() });
    expect(res.status).toBe(200);
  });
});

describe('Admin API — System Settings', () => {
  beforeAll(async () => { await adminLogin(); }, 15000);

  it('GET /admin/settings — should return settings', async () => {
    const res = await axios.get(`${BASE}/admin/settings`, { headers: auth() });
    expect(res.status).toBe(200);
  });

  it('PUT /admin/settings — should update settings', async () => {
    const res = await axios.put(`${BASE}/admin/settings`, {
      test_key: 'test_value_' + Date.now(),
    }, { headers: auth() });
    expect(res.status).toBe(200);
    expect(res.data?.success).toBe(true);
  });
});

describe('Admin API — Crash Reports', () => {
  it('POST /admin/crash-reports — should accept crash report (no auth)', async () => {
    const res = await axios.post(`${BASE}/admin/crash-reports`, {
      errorMessage: 'Integration test crash ' + Date.now(),
      platform: 'test',
      screen: 'IntegrationTest',
    });
    expect(res.status).toBe(201);
  });

  it('GET /admin/crash-reports — admin can list (with auth)', async () => {
    await adminLogin();
    const res = await axios.get(`${BASE}/admin/crash-reports`, { headers: auth() });
    expect(res.status).toBe(200);
  });
});
