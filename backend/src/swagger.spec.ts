import { isSwaggerEnabled } from './swagger';

describe('isSwaggerEnabled', () => {
  it('is enabled when NODE_ENV is not set', () => {
    expect(isSwaggerEnabled({})).toBe(true);
  });

  it('is enabled in development', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
  });

  it('is disabled in production', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('can be forced on in production with SWAGGER_ENABLED=true', () => {
    expect(
      isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }),
    ).toBe(true);
  });

  it('can be forced off in development with SWAGGER_ENABLED=false', () => {
    expect(
      isSwaggerEnabled({ NODE_ENV: 'development', SWAGGER_ENABLED: 'FALSE' }),
    ).toBe(false);
  });

  it('falls back to NODE_ENV when SWAGGER_ENABLED is empty', () => {
    expect(
      isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: '' }),
    ).toBe(false);
  });
});
