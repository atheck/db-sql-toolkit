import { Database } from "./Database";

type BulkStatementParams<T> = [string, (data: T) => unknown[]];
type BulkExecuteStatementParams = [string, unknown[], unknown[]];

/**
 * Inserts data into a database in as few operations as possible.
 * @param database The database.
 * @param entities The collection of data to insert.
 * @param param2 A tuple consisting of the "INSERT INTO" SQL statement a function to get the parameters for one entity. The number of parameters must be equal for all entities.
 */
async function bulkInsertEntities<T>(
	database: Database,
	entities: T[],
	[statement, getParameters]: BulkStatementParams<T>,
): Promise<void> {
	if (!entities[0]) {
		return;
	}

	ensurePlaceholderCount(statement, 1);

	const paramsPerEntity = getParameters(entities[0]).length;
	const chunkSize = Math.floor(database.MaxVariableNumber / paramsPerEntity);
	const parametersStatement = Array.from({ length: paramsPerEntity }).fill("?").join(",");

	const chunkEntities = [...entities];

	let chunk: T[] = [];
	const promises: Promise<void>[] = [];

	while (chunkEntities.length > 0) {
		chunk = chunkEntities.splice(0, chunkSize);

		const values = chunk.flatMap(getParameters);
		const valueStatement = Array.from({ length: chunk.length }).fill(parametersStatement).join("),(");

		const fullStatement = statement.replace("?", valueStatement);

		promises.push(database.executeSqlCommand(fullStatement, values));
	}

	await Promise.all(promises);
}

/**
 * Executes a statement in as few operations as possible.
 * @param database The database.
 * @param executeParams A tuple consisting of the SQL statement, the parameters of the "WHERE" clause, and the parameters of the "IN" clause.
 */
async function bulkExecuteCommand(database: Database, executeParams: BulkExecuteStatementParams): Promise<void> {
	await bulkDo(database, executeParams, database.executeSqlCommand);
}

/**
 * Loads data from a database in as few operations as possible.
 * @param database The database.
 * @param executeParams The tuple consisting of the SQL statement, the parameters of the "WHERE" clause, and the parameters of the "IN" clause.
 */
async function bulkGetRows<TData>(database: Database, executeParams: BulkExecuteStatementParams): Promise<TData[]> {
	const results = await bulkDo<TData[]>(database, executeParams, database.getRows);

	return results.flat();
}

async function bulkDo<TData>(
	database: Database,
	[statement, keys, bulkKeys]: BulkExecuteStatementParams,
	op: (statement: string, parameters: unknown[]) => Promise<TData>,
): Promise<TData[]> {
	if (bulkKeys.length === 0) {
		return [];
	}

	ensurePlaceholderCount(statement, keys.length + 1);

	const lastParameterPlaceholderIndex = statement.lastIndexOf("?");
	const statementToLastPlaceholder = statement.slice(0, lastParameterPlaceholderIndex);
	const statementFromLastPlaceholder = statement.slice(lastParameterPlaceholderIndex + 1);

	const chunkSize = database.MaxVariableNumber - keys.length;
	const allBulkKeys = [...bulkKeys];

	const promises: Promise<TData>[] = [];

	while (allBulkKeys.length > 0) {
		const chunkBulkKeys = allBulkKeys.splice(0, chunkSize);
		const parametersStatement = Array.from({ length: chunkBulkKeys.length }).fill("?").join(",");
		const fullStatement = `${statementToLastPlaceholder}${parametersStatement}${statementFromLastPlaceholder}`;

		promises.push(op(fullStatement, [...keys, ...chunkBulkKeys]));
	}

	const results = await Promise.all(promises);

	return results;
}

function ensurePlaceholderCount(statement: string, expectedCount: number): void {
	const placeholderCount = statement.match(/\?/gu)?.length ?? 0;

	if (placeholderCount !== expectedCount) {
		throw new Error("The number of placeholders does not match the parameters.");
	}
}

export type { BulkStatementParams, BulkExecuteStatementParams };

export { bulkInsertEntities, bulkExecuteCommand, bulkGetRows };
