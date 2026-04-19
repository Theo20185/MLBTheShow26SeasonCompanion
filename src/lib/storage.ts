// Typed, schema-versioned wrapper around the browser's localStorage.
//
// The storage layer is the source of truth for user save state (Season,
// TeamRecord[], HeadToHead, etc. — see PLAN.md §6.8). It must:
//   - serialize/deserialize JSON safely
//   - validate that what we read matches the expected shape
//   - support schema versioning + migrations so old saves keep working
//   - be atomic: a failed write must never corrupt prior state

export class StoredVersionError extends Error {
  storedVersion: number
  currentVersion: number
  constructor(storedVersion: number, currentVersion: number) {
    super(
      `Stored data is at version ${storedVersion} but the app expects ${currentVersion} (no migration registered)`
    )
    this.name = 'StoredVersionError'
    this.storedVersion = storedVersion
    this.currentVersion = currentVersion
  }
}

export class StoredSchemaError extends Error {
  override cause: unknown
  constructor(cause: unknown) {
    super(`Stored data failed schema validation: ${String(cause)}`)
    this.name = 'StoredSchemaError'
    this.cause = cause
  }
}

interface StoredEnvelope<T> {
  version: number
  data: T
}

export interface StoreOptions<T> {
  /** localStorage key */
  key: string
  /** Current schema version. Bump when you change the shape. */
  version: number
  /** Validate raw data and return the typed value, or throw. */
  validate: (raw: unknown) => T
  /**
   * Optional migrations. Keyed by target version: e.g. `migrations[3]` runs
   * when reading a v2 record and the current version is 3. Each migration
   * receives the prior version's data.
   */
  migrations?: Record<number, (oldData: unknown) => unknown>
}

export interface Store<T> {
  get(): T | null
  set(value: T): void
  remove(): void
}

export function createStore<T>(opts: StoreOptions<T>): Store<T> {
  const { key, version, validate, migrations = {} } = opts

  function get(): T | null {
    const raw = localStorage.getItem(key)
    if (raw === null) return null

    let envelope: StoredEnvelope<unknown>
    try {
      envelope = JSON.parse(raw) as StoredEnvelope<unknown>
    } catch (err) {
      throw new StoredSchemaError(err)
    }

    if (
      typeof envelope !== 'object' ||
      envelope === null ||
      typeof envelope.version !== 'number'
    ) {
      throw new StoredSchemaError('envelope missing version')
    }

    let data: unknown = envelope.data
    let currentStoredVersion = envelope.version

    // Run migrations forward until we reach the current version, or fail.
    while (currentStoredVersion < version) {
      const next = currentStoredVersion + 1
      const migrate = migrations[next]
      if (!migrate) {
        throw new StoredVersionError(currentStoredVersion, version)
      }
      data = migrate(data)
      currentStoredVersion = next
    }

    if (currentStoredVersion > version) {
      throw new StoredVersionError(currentStoredVersion, version)
    }

    let validated: T
    try {
      validated = validate(data)
    } catch (err) {
      throw new StoredSchemaError(err)
    }

    // Persist any migration result so subsequent reads skip the work.
    if (currentStoredVersion !== envelope.version) {
      writeEnvelope(key, version, validated)
    }

    return validated
  }

  function set(value: T): void {
    // Serialize first so a serialize failure (e.g. circular reference)
    // throws before we touch storage. Atomicity by construction.
    const serialized = JSON.stringify({ version, data: value })
    localStorage.setItem(key, serialized)
  }

  function remove(): void {
    localStorage.removeItem(key)
  }

  return { get, set, remove }
}

function writeEnvelope<T>(key: string, version: number, data: T): void {
  localStorage.setItem(key, JSON.stringify({ version, data }))
}
