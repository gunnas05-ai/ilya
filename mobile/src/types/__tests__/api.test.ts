import { unwrapResponse, unwrapList } from '../api';

describe('unwrapResponse', () => {
  it('should unwrap NestJS {success, data}', () => {
    const res = { data: { data: { id: '1', name: 'Test' } } };
    expect(unwrapResponse(res)).toEqual({ id: '1', name: 'Test' });
  });

  it('should unwrap {data} directly', () => {
    const res = { data: { id: '1' } };
    expect(unwrapResponse(res)).toEqual({ id: '1' });
  });

  it('should return raw if no data wrapper', () => {
    const obj = { id: '1' };
    expect(unwrapResponse(obj)).toEqual({ id: '1' });
  });

  it('should handle null gracefully', () => {
    expect(unwrapResponse(null)).toBeNull();
  });

  it('should handle undefined gracefully', () => {
    expect(unwrapResponse(undefined)).toBeUndefined();
  });

  it('should unwrap axios response shape', () => {
    const res = { data: { success: true, data: [{ id: '1' }] } };
    expect(unwrapResponse(res)).toEqual([{ id: '1' }]);
  });
});

describe('unwrapList', () => {
  it('should unwrap paginated response', () => {
    const res = { data: { data: { data: [{ id: '1' }, { id: '2' }] } } };
    expect(unwrapList(res)).toHaveLength(2);
  });

  it('should handle raw array', () => {
    expect(unwrapList([{ id: '1' }])).toHaveLength(1);
  });

  it('should unwrap {items} format', () => {
    const res = { data: { items: [{ id: '1' }, { id: '2' }, { id: '3' }] } };
    expect(unwrapList(res)).toHaveLength(3);
  });

  it('should return empty array for null', () => {
    expect(unwrapList(null)).toEqual([]);
  });

  it('should return empty array for empty object', () => {
    expect(unwrapList({})).toEqual([]);
  });

  it('should unwrap {data: [...]}', () => {
    const res = { data: [{ id: '1' }, { id: '2' }] };
    expect(unwrapList(res)).toHaveLength(2);
  });
});
