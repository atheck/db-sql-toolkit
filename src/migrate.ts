import { Database } from "./Database";

interface MigrationOptions {
	database: Database;
	targetVersion: number;
	getCurrentVersion: (database: Database) => Promise<number>;
	updateVersion: (database: Database, version: number) => Promise<void>;
	migrationMap: Migration[];
}

type Migration = [version: number, apply: (database: Database) => Promise<void>];

async function migrate({
	database,
	targetVersion,
	getCurrentVersion,
	updateVersion,
	migrationMap,
}: MigrationOptions): Promise<void> {
	const currentVersion = await getCurrentVersion(database);

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

	await updateVersion(database, migratedToVersion);
}

function sortMigrationsByVersion(migrationMap: Migration[]): Migration[] {
	return [...migrationMap].sort(([firstVersion], [secondVersion]) => firstVersion - secondVersion);
}

export type { MigrationOptions };

export { migrate };
