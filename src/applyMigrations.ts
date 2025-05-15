import type { Database } from "./Database";
import { sql } from "./sql";

type DbMigrationId = string;

interface ApplyMigrationsOptions<TDatabase extends Database> {
	database: TDatabase;
	migrations: Migration<TDatabase>[];
	targetId?: DbMigrationId;
	getExecutedMigrationIds?: ((database: TDatabase) => Promise<DbMigrationId[]>) | null;
	insertMigrationId?: ((database: TDatabase, id: DbMigrationId) => Promise<void>) | null;
	writeLog?: (message: string) => void;
}

interface Migration<TDatabase> {
	id: DbMigrationId;
	apply: (database: TDatabase) => Promise<void>;
}

async function applyMigrations<TDatabase extends Database>({
	database,
	migrations,
	targetId,
	getExecutedMigrationIds,
	insertMigrationId,
	writeLog,
}: ApplyMigrationsOptions<TDatabase>): Promise<void> {
	const executedMigrationIds = await (getExecutedMigrationIds ?? defaultGetExecutedMigrationIds)(database);

	if (executedMigrationIds.length === 0) {
		writeLog?.("No previously applied migrations.");
	} else {
		const lastId = executedMigrationIds.at(-1);

		writeLog?.(`Previously applied ${executedMigrationIds.length} migrations, last id="${lastId}".`);
	}

	for (const { id, apply } of migrations) {
		if (executedMigrationIds.includes(id)) {
			if (id === targetId) {
				break;
			}
			continue;
		}

		/* eslint-disable no-await-in-loop */
		await apply(database);
		await (insertMigrationId ?? defaultUpdateVersion)(database, id);
		/* eslint-enable no-await-in-loop */

		writeLog?.(`Applied migration "${id}".`);

		if (id === targetId) {
			break;
		}
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

export type { ApplyMigrationsOptions };

export { applyMigrations };
