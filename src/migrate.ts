import { Database } from "./Database";
import { sql } from "./sql";

interface MigrationOptions<TDatabase extends Database> {
	database: TDatabase;
	targetVersion: number;
	getCurrentVersion?: ((database: TDatabase) => Promise<number>) | null;
	updateVersion?: ((database: TDatabase, version: number) => Promise<void>) | null;
	migrationMap: Migration<TDatabase>[];
	writeLog?: (message: string) => void;
}

type Migration<TDatabase> = [version: number, apply: (database: TDatabase) => Promise<void>];

async function migrate<TDatabase extends Database>({
	database,
	targetVersion,
	getCurrentVersion,
	updateVersion,
	migrationMap,
	writeLog,
}: MigrationOptions<TDatabase>): Promise<void> {
	const getDbVersion = getCurrentVersion ?? defaultGetDbVersion;
	const updateDbVersion = updateVersion ?? defaultUpdateVersion;

	const currentVersion = await getDbVersion(database);

	writeLog?.(`Current database version: ${currentVersion}`);

	if (currentVersion === targetVersion) {
		return;
	}

	const sortedMigrationMap = sortMigrationsByVersion(migrationMap);
	const lastMigration = sortedMigrationMap.at(-1);

	if (!lastMigration || lastMigration[0] < targetVersion) {
		throw new Error("Target version cannot be reached.");
	}

	let migratedToVersion = currentVersion;

	for (const [nextVersion, apply] of sortedMigrationMap) {
		if (nextVersion > targetVersion) {
			break;
		}

		if (currentVersion < nextVersion) {
			// eslint-disable-next-line no-await-in-loop
			await apply(database);

			migratedToVersion = nextVersion;
		}
	}

	await updateDbVersion(database, migratedToVersion);

	writeLog?.(`Updated database to version ${migratedToVersion}`);
}

function sortMigrationsByVersion<TDatabase>(migrationMap: Migration<TDatabase>[]): Migration<TDatabase>[] {
	return [...migrationMap].sort(([firstVersion], [secondVersion]) => firstVersion - secondVersion);
}

interface DbVersionTable {
	version: number;
}

async function defaultGetDbVersion(database: Database): Promise<number> {
	try {
		const versions = await database.getRows<DbVersionTable>(...sql`SELECT version FROM db_version`);

		if (versions.length === 0) {
			return -1;
		}

		const currentVersion = versions.map((version) => version.version).reduce((prev, current) => Math.max(prev, current), 0);

		return currentVersion;
	} catch {
		await createDbVersionTable(database);

		return -1;
	}
}

async function defaultUpdateVersion(database: Database, version: number): Promise<void> {
	await database.executeSqlCommand(...sql`INSERT OR REPLACE INTO db_version (version) VALUES (${version})`);
}

async function createDbVersionTable(database: Database): Promise<void> {
	await database.executeSqlCommand(
		...sql`
			CREATE TABLE IF NOT EXISTS db_version (
				version INTEGER NOT NULL,
				PRIMARY KEY (
					version
				)
			);
		`,
	);
}

export type { MigrationOptions };

export { migrate };
