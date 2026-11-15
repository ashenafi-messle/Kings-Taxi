import { describe, it, expect } from 'vitest';
import { checkDatabaseIsolation } from '../../src/config/database-isolation';

describe('Database Isolation Safeguard', () => {
  const validRenderUrl =
    'postgresql://kings_taxi_dev_user:SecretP%40ss123@127.0.0.1:15433/kings_taxi_dev?schema=public&sslmode=disable';

  it('1. accepts valid Render development database URL with correct username in strict mode', () => {
    const result = checkDatabaseIsolation(validRenderUrl, true);
    expect(result.valid).toBe(true);
    expect(result.details).toBeDefined();
    expect(result.details?.protocol).toBe('postgresql:');
    expect(result.details?.host).toBe('127.0.0.1');
    expect(result.details?.port).toBe('15433');
    expect(result.details?.database).toBe('kings_taxi_dev');
    expect(result.details?.username).toBe('kings_taxi_dev_user');
  });

  it('2. rejects incorrect database username in strict production mode', () => {
    const wrongUserUrl =
      'postgresql://admin_user:SecretPass@127.0.0.1:15433/kings_taxi_dev?schema=public';
    const result = checkDatabaseIsolation(wrongUserUrl, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid database username 'admin_user'");
    expect(result.error).toContain("strictly requires database account 'kings_taxi_dev_user'");
    expect(result.error).not.toContain('SecretPass');
  });

  it('3. rejects missing database username in strict production mode', () => {
    const noUserUrl =
      'postgresql://127.0.0.1:15433/kings_taxi_dev?schema=public';
    const result = checkDatabaseIsolation(noUserUrl, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing database username');
    expect(result.error).toContain("strictly requires database account 'kings_taxi_dev_user'");
  });

  it('4. strictly blocks connection to production database kings_taxi (in both strict and non-strict modes)', () => {
    const prodDbUrl =
      'postgresql://kings_taxi_dev_user:SecretPass@127.0.0.1:15433/kings_taxi?schema=public';
    
    // In non-strict mode
    const nonStrictResult = checkDatabaseIsolation(prodDbUrl, false);
    expect(nonStrictResult.valid).toBe(false);
    expect(nonStrictResult.error).toContain('production database and is strictly blocked');
    expect(nonStrictResult.error).not.toContain('SecretPass');

    // In strict mode
    const strictResult = checkDatabaseIsolation(prodDbUrl, true);
    expect(strictResult.valid).toBe(false);
    expect(strictResult.error).toContain('production database and is strictly blocked');
    expect(strictResult.error).not.toContain('SecretPass');
  });

  it('5. rejects host other than 127.0.0.1 in strict mode', () => {
    const vpsDirectUrl =
      'postgresql://kings_taxi_dev_user:SecretPass@196.188.250.186:15433/kings_taxi_dev';
    const result = checkDatabaseIsolation(vpsDirectUrl, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid host '196.188.250.186'");
    expect(result.error).toContain("strictly to '127.0.0.1'");
    expect(result.error).not.toContain('SecretPass');
  });

  it('6. rejects port other than 15433 in strict mode', () => {
    const wrongPortUrl =
      'postgresql://kings_taxi_dev_user:SecretPass@127.0.0.1:5432/kings_taxi_dev';
    const result = checkDatabaseIsolation(wrongPortUrl, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid port '5432'");
    expect(result.error).toContain("strictly port '15433'");
    expect(result.error).not.toContain('SecretPass');
  });

  it('7. accepts correct development database configuration in non-strict mode (port 5433)', () => {
    const devUrl =
      'postgresql://kings_taxi_dev_user:Uog%40%40%23%23%24%240922@127.0.0.1:5433/kings_taxi_dev?schema=public&sslmode=disable';
    const result = checkDatabaseIsolation(devUrl, false);
    expect(result.valid).toBe(true);
    expect(result.details?.host).toBe('127.0.0.1');
    expect(result.details?.port).toBe('5433');
    expect(result.details?.database).toBe('kings_taxi_dev');
    expect(result.details?.username).toBe('kings_taxi_dev_user');
  });

  it('8. handles URL-encoded credentials and special characters without exposing password', () => {
    const complexCredsUrl =
      'postgresql://kings_taxi_dev_user:P%40%23%24%25%5E%26*()123@127.0.0.1:15433/kings_taxi_dev';
    const result = checkDatabaseIsolation(complexCredsUrl, true);
    expect(result.valid).toBe(true);
    expect(result.details?.username).toBe('kings_taxi_dev_user');
    // Ensure raw password is not part of returned details
    expect(JSON.stringify(result)).not.toContain('P%40%23%24%25%5E%26*()123');
  });

  it('9. rejects database names other than kings_taxi_dev', () => {
    const wrongDbUrl =
      'postgresql://kings_taxi_dev_user:SecretPass@127.0.0.1:15433/some_other_db';
    const result = checkDatabaseIsolation(wrongDbUrl, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid database 'some_other_db'");
  });

  it('10. rejects non-PostgreSQL protocols', () => {
    const mysqlUrl =
      'mysql://kings_taxi_dev_user:SecretPass@127.0.0.1:15433/kings_taxi_dev';
    const result = checkDatabaseIsolation(mysqlUrl, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid protocol 'mysql:'");
  });

  it('11. rejects empty or missing DATABASE_URL', () => {
    const result = checkDatabaseIsolation('', true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('missing or empty');
  });
});
