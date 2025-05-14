import type { Database } from "./Database";
import { sql } from "./sql";

type DbMigrationId = string;

interface ExecuteMigrationsOptions<TDatabase extends Database> {
	database: TDatabase;
	getExecutedMigrationIds?: ((database: TDatabase) => Promise<DbMigrationId[]>) | null;
	insertMigrationId?: ((database: TDatabase, id: DbMigrationId) => Promise<void>) | null;
	migrations: Migration<TDatabase>[];
	writeLog?: (message: string) => void;
}

interface Migration<TDatabase> {
	id: DbMigrationId;
	apply: (database: TDatabase) => Promise<void>;
}

async function executeMigrations<TDatabase extends Database>({
	database,
	getExecutedMigrationIds,
	insertMigrationId,
	migrations,
	writeLog,
}: ExecuteMigrationsOptions<TDatabase>): Promise<void> {
	const executedMigrationIds = await (getExecutedMigrationIds ?? defaultGetExecutedMigrationIds)(database);

	writeLog?.(`Previously executed migrations: ${executedMigrationIds.join(", ")}`);

	for (const { id, apply } of migrations) {
		if (executedMigrationIds.includes(id)) {
			continue;
		}

		/* eslint-disable no-await-in-loop */
		await apply(database);
		await (insertMigrationId ?? defaultUpdateVersion)(database, id);
		/* eslint-enable no-await-in-loop */

		writeLog?.(`Executed migration "${id}"`);
	}
}

interface DbMigrationsTable {
	id: DbMigrationId;
}

async function defaultGetExecutedMigrationIds(database: Database): Promise<DbMigrationId[]> {
	try {
		const migrations = await database.getRows<DbMigrationsTable>(...sql`SELECT id FROM _db_migration`);

		return migrations.map((migration) => migration.id);
	} catch {
		await createDbVersionTable(database);

		return [];
	}
}

async function defaultUpdateVersion(database: Database, id: DbMigrationId): Promise<void> {
	await database.executeSqlCommand(...sql`INSERT INTO _db_migration (id) VALUES (${id})`);
}

async function createDbVersionTable(database: Database): Promise<void> {
	await database.executeSqlCommand(
		...sql`
			CREATE TABLE IF NOT EXISTS _db_migration (
				id VARCHAR NOT NULL,
				PRIMARY KEY (
					id
				)
			);
		`,
	);
}

export type { ExecuteMigrationsOptions };

export { executeMigrations };
