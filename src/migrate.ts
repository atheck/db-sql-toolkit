import { Database } from "./Database";

interface MigrationOptions {
	database: Database;
	targetVersion: number;
	getCurrentVersion: (database: Database) => Promise<number>;
	updateVersion: (database: Database) => Promise<void>;
	migrationMap: [version: number, apply: (database: Database) => Promise<void>][];
}

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

	for (const [nextVersion, apply] of migrationMap) {
		if (nextVersion > targetVersion) {
			break;
		}

		if (currentVersion < nextVersion) {
			// eslint-disable-next-line no-await-in-loop
			await apply(database);
		}
	}

	await updateVersion(database);
}

export type { MigrationOptions };

export { migrate };
