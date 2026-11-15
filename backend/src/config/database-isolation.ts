/**
 * ==============================================================================
 * Kings Taxi Central Backend — Database Isolation Safeguard
 * ==============================================================================
 * Enforces strict database isolation for Render deployment:
 * 1. Protocol must be PostgreSQL (postgresql: or postgres:).
 * 2. Host must be strictly 127.0.0.1 (via local SSH tunnel).
 * 3. Port must be strictly 15433 (Render container SSH tunnel endpoint).
 * 4. Target database must be strictly kings_taxi_dev.
 * 5. Production database `kings_taxi` is unconditionally forbidden.
 * 6. Never exposes passwords, credentials, or sensitive query strings in logs.
 * ==============================================================================
 */

export interface DatabaseIsolationDetails {
  protocol: string;
  host: string;
  port: string;
  database: string;
  username: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: DatabaseIsolationDetails;
}

/**
 * Parses and validates database connection URL against strict isolation rules.
 * All credentials (passwords, tokens) are stripped before logging or reporting.
 */
export function checkDatabaseIsolation(
  rawUrl: string | undefined,
  strictTunnel = false
): ValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return {
      valid: false,
      error: 'DATABASE_URL is missing or empty.',
    };
  }

  try {
    const url = new URL(rawUrl);
    const protocol = url.protocol;
    const host = url.hostname;
    const port = url.port || (protocol === 'postgresql:' || protocol === 'postgres:' ? '5432' : '');
    const database = url.pathname.replace(/^\//, '').split('?')[0];
    const username = url.username;

    const details: DatabaseIsolationDetails = {
      protocol,
      host,
      port,
      database,
      username,
    };

    // Rule 1: Protocol must be PostgreSQL
    if (protocol !== 'postgresql:' && protocol !== 'postgres:') {
      return {
        valid: false,
        error: `Invalid protocol '${protocol}'. Expected 'postgresql:' or 'postgres:'.`,
        details,
      };
    }

    // Rule 2: Production database `kings_taxi` is strictly forbidden in all non-VPS direct contexts
    if (database.toLowerCase() === 'kings_taxi') {
      return {
        valid: false,
        error: "CRITICAL ISOLATION VIOLATION: Target database 'kings_taxi' is the production database and is strictly blocked.",
        details,
      };
    }

    // Rule 3: Target database must be exactly kings_taxi_dev
    if (database !== 'kings_taxi_dev') {
      return {
        valid: false,
        error: `Invalid database '${database}'. Render deployment is restricted exclusively to 'kings_taxi_dev'.`,
        details,
      };
    }

    // Rule 4: If strict tunnel enforcement is enabled (production / Render)
    if (strictTunnel) {
      if (host !== '127.0.0.1') {
        return {
          valid: false,
          error: `Invalid host '${host}'. Render deployment must connect strictly to '127.0.0.1' via the local SSH tunnel.`,
          details,
        };
      }

      if (port !== '15433') {
        return {
          valid: false,
          error: `Invalid port '${port}'. Render deployment must use strictly port '15433' via the local SSH tunnel.`,
          details,
        };
      }

      if (!username || username.trim() === '') {
        return {
          valid: false,
          error: "Missing database username. Render deployment strictly requires database account 'kings_taxi_dev_user'.",
          details,
        };
      }

      const decodedUsername = decodeURIComponent(username);
      if (decodedUsername !== 'kings_taxi_dev_user') {
        return {
          valid: false,
          error: `Invalid database username '${decodedUsername}'. Render deployment strictly requires database account 'kings_taxi_dev_user'.`,
          details,
        };
      }
    }

    return {
      valid: true,
      details,
    };
  } catch (_parseErr) {
    return {
      valid: false,
      error: 'DATABASE_URL could not be parsed as a valid connection URL (credentials redacted).',
    };
  }
}

/**
 * Validates the database URL at server startup.
 * If validation fails, logs a clear, credential-safe fatal error and terminates startup.
 */
export function validateDatabaseIsolationAtStartup(rawUrl: string | undefined): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRender = process.env.RENDER === 'true';
  const isStrictEnv = process.env.STRICT_DB_ISOLATION === 'true';
  const isStrictTunnel = isProduction || isRender || isStrictEnv;

  const result = checkDatabaseIsolation(rawUrl, isStrictTunnel);

  if (!result.valid) {
    const errorMsg = result.error || 'Unknown database isolation error.';
    console.error('================================================================================');
    console.error('  [FATAL] KINGS TAXI DATABASE ISOLATION SAFEGUARD VIOLATION');
    console.error('================================================================================');
    console.error(`  Error: ${errorMsg}`);
    if (result.details) {
      console.error('  Attempted Configuration (Sanitized):');
      console.error(`    - Protocol : ${result.details.protocol}`);
      console.error(`    - Host     : ${result.details.host}`);
      console.error(`    - Port     : ${result.details.port}`);
      console.error(`    - Database : ${result.details.database}`);
      console.error(`    - Username : ${result.details.username || '(none)'}`);
      console.error('    - Password : [REDACTED]');
    }
    console.error('--------------------------------------------------------------------------------');
    console.error('  Expected Render Configuration:');
    console.error('    - Protocol : postgresql:');
    console.error('    - Host     : 127.0.0.1');
    console.error('    - Port     : 15433');
    console.error('    - Database : kings_taxi_dev');
    console.error('    - Account  : kings_taxi_dev_user');
    console.error('================================================================================');
    console.error('  Terminating server process immediately to preserve database safety.');
    console.error('================================================================================');

    process.exit(1);
  }

  // Log successful startup check (sanitized, zero credentials leaked)
  if (result.details) {
    console.log(
      `[DB Isolation] Verified: protocol=${result.details.protocol} host=${result.details.host} port=${result.details.port} database=${result.details.database} user=${result.details.username}`
    );
  }
}

