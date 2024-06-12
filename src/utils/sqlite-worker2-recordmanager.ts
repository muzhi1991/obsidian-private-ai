import log from 'loglevel';
import type { RecordManagerInterface, UpdateOptions, ListKeyOptions } from "@langchain/community/indexes/base";
import { DatabaseManager, Statement } from "./sqlite-db"
import { escapeSingleQuote } from './string-utils';


interface TimeRow {
  epoch: number;
}

interface KeyRecord {
  key: string;
}


export class SqlitWorker2RecordManager implements RecordManagerInterface {
  lc_namespace = ["langchain", "recordmanagers", "sqlite"];

  tableName: string;

  db: DatabaseManager;

  namespace: string;

  constructor(namespace: string, tableName: string) {
    this.namespace = namespace;
    this.tableName = tableName;
    this.db = DatabaseManager.getInstance()
  }

  async createSchema(): Promise<void> {
    try {
      await this.db.prepare(`
CREATE TABLE IF NOT EXISTS "${this.tableName}" (
  uuid TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT NOT NULL,
  namespace TEXT NOT NULL,
  updated_at REAL NOT NULL,
  group_id TEXT,
  UNIQUE (key, namespace)
);
CREATE INDEX IF NOT EXISTS updated_at_index ON "${this.tableName}" (updated_at);
CREATE INDEX IF NOT EXISTS key_index ON "${this.tableName}" (key);
CREATE INDEX IF NOT EXISTS namespace_index ON "${this.tableName}" (namespace);
CREATE INDEX IF NOT EXISTS group_id_index ON "${this.tableName}" (group_id);`).run();
    } catch (error) {
      log.error("Error creating schema");
      throw error; // Re-throw the error to let the caller handle it
    }
  }

  async getTime(): Promise<number> {
    try {
      const res = await this.db.prepare(
        "SELECT strftime('%s', 'now') AS epoch"
      ).get();
      const timeRow: TimeRow = { epoch: res };
      const { epoch } = timeRow;
      return Number(epoch);
    } catch (error) {
      log.error("Error getting time in SQLiteRecordManager:");
      throw error;
    }
  }

  async getCount() {
    return await this.db.prepare(`select count(1) from "${this.tableName}"`).get();
  }
  async getLatestUpdateSecondTime() {
    return await this.db.prepare(`select max(updated_at) from "${this.tableName}"`).get()
  }

  async update(keys: string[], updateOptions?: UpdateOptions): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const updatedAt = await this.getTime();
    const { timeAtLeast, groupIds: _groupIds } = updateOptions ?? {};

    if (timeAtLeast && updatedAt < timeAtLeast) {
      throw new Error(
        `Time sync issue with database ${updatedAt} < ${timeAtLeast}`
      );
    }

    const groupIds = _groupIds ?? keys.map(() => null);

    if (groupIds.length !== keys.length) {
      throw new Error(
        `Number of keys (${keys.length}) does not match number of group_ids (${groupIds.length})`
      );
    }

    const recordsToUpsert = keys.map((key, i) => [
      key,
      this.namespace,
      updatedAt,
      groupIds[i] ?? null, // Ensure groupIds[i] is null if undefined
    ]);

    // Consider using a transaction for batch operations
    let sqls: Statement[] = []
    for (const row of recordsToUpsert) {
      sqls.push(this.db.prepare(`
            INSERT INTO "${this.tableName}" (key, namespace, updated_at, group_id)
            VALUES ('${row[0]}', '${row[1]}', ${row[2]}, '${row[3] === null ? null : escapeSingleQuote(row[3] as string)}')
            ON CONFLICT (key, namespace) DO UPDATE SET updated_at = excluded.updated_at`))
    }
    await this.db.transaction(sqls)
  }



  async exists(keys: string[]): Promise<boolean[]> {
    if (keys.length === 0) {
      return [];
    }

    // Prepare the placeholders and the query
    const placeholders = keys.map(() => `?`).join(", ");
    const sql = `
SELECT key
FROM "${this.tableName}"
WHERE namespace = ? AND key IN (${placeholders})`;

    // Initialize an array to fill with the existence checks
    const existsArray = new Array(keys.length).fill(false);

    try {
      // Execute the query
      const rows = (await this.db
        .prepare(sql)
        .all(this.namespace, ...keys)).map((v) => ({ key: v })) as KeyRecord[];
      // Create a set of existing keys for faster lookup
      const existingKeysSet = new Set(rows.map((row) => row.key));
      // Map the input keys to booleans indicating if they exist
      keys.forEach((key, index) => {
        existsArray[index] = existingKeysSet.has(key);
      });
      log.trace("cache exists:", existingKeysSet, keys, existsArray)
      return existsArray;
    } catch (error) {
      log.error("Error checking existence of keys");
      throw error; // Allow the caller to handle the error
    }
  }

  async listKeys(options?: ListKeyOptions): Promise<string[]> {
    const { before, after, limit, groupIds } = options ?? {};
    let query = `SELECT key FROM "${this.tableName}" WHERE namespace = ?`;
    const values: (string | number | null)[] = [this.namespace];

    if (before) {
      query += ` AND updated_at < ?`;
      values.push(before);
    }

    if (after) {
      query += ` AND updated_at > ?`;
      values.push(after);
    }

    if (limit) {
      query += ` LIMIT ?`;
      values.push(limit);
    }

    if (groupIds && Array.isArray(groupIds)) {
      query += ` AND group_id IN (${groupIds
        .filter((gid) => gid !== null)
        .map(() => "?")
        .join(", ")})`;
      values.push(...groupIds.filter((gid): gid is string => gid !== null));
    }

    query += ";";

    // Directly using try/catch with async/await for cleaner flow
    try {
      const result = (await this.db.prepare(query).all(...values)).map((v) => ({ key: v }));
      return result.map((row) => row.key);
    } catch (error) {
      log.error("Error listing keys.");
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  async deleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const placeholders = keys.map(() => "?").join(", ");
    const query = `DELETE FROM "${this.tableName}" WHERE namespace = ? AND key IN (${placeholders});`;
    const values = [this.namespace, ...keys].map((v) =>
      typeof v !== "string" ? `${v}` : v
    );

    // Directly using try/catch with async/await for cleaner flow
    try {
      await this.db.prepare(query).run(...values);
    } catch (error) {
      log.error("Error deleting keys");
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  async clear() {
    let res = await this.db.prepare(`DROP TABLE "${this.tableName}"`).run();
    log.trace("delete table res:", res)
    await this.createSchema()
  }

}