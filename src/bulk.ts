import { type CountRow, type Database, countPropertyName } from "./Database";

interface BulkStatementParams<TData, TParams extends unknown[] = unknown[]> {
	statement: string;
	getParameters: (data: TData) => TParams;
}

interface BulkExecuteStatementParams<TParams extends unknown[] = unknown[]> {
	statement: string;
	parameters: TParams;
	bulkParameters: TParams;
	bulkParametersIndex: number;
}

/**
 * Inserts data into a database in as few operations as possible.
 * @param database The database.
 * @param entities The collection of data to insert.
 * @param param2 A tuple consisting of the "INSERT INTO" SQL statement a function to get the parameters for one entity. The number of parameters must be equal for all entities.
 */
async function bulkInsertEntities<TData, TParams extends unknown[] = unknown[]>(
	database: Database<TParams>,
	entities: TData[],
	{ statement, getParameters }: BulkStatementParams<TData, TParams>,
): Promise<void> {
	if (!entities[0]) {
		return;
	}

	ensurePlaceholderCount(statement, 1);

	const paramsPerEntity = getParameters(entities[0]).length;
	const chunkSize = Math.floor(database.MaxVariableNumber / paramsPerEntity);
	const parametersStatement = Array.from({ length: paramsPerEntity }).fill("?").join(",");

	const chunkEntities = [...entities];

	let chunk: TData[];
	const promises: Promise<void>[] = [];

	while (chunkEntities.length > 0) {
		chunk = chunkEntities.splice(0, chunkSize);

		const values = chunk.flatMap(getParameters) as TParams;
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
async function bulkExecuteCommand<TParams extends unknown[] = unknown[]>(
	database: Database<TParams>,
	executeParams: BulkExecuteStatementParams<TParams>,
): Promise<void> {
	await bulkDo(database, executeParams, database.executeSqlCommand);
}

/**
 * Loads data from a database in as few operations as possible.
 * @param database The database.
 * @param executeParams The tuple consisting of the SQL statement, the parameters of the "WHERE" clause, and the parameters of the "IN" clause.
 */
async function bulkGetRows<TData, TParams extends unknown[] = unknown[]>(
	database: Database<TParams>,
	executeParams: BulkExecuteStatementParams<TParams>,
): Promise<TData[]> {
	const results = await bulkDo<TData[], TParams>(database, executeParams, database.getRows);

	return results.flat();
}

/**
 * Gets the total count of rows from a database in as few operations as possible.
 * @param database The database.
 * @param executeParams The tuple consisting of the SQL statement, the parameters of the "WHERE" clause, and the parameters of the "IN" clause.
 * @returns The total count of rows.
 * @example
 * ```ts
 * const priorities = ["1", "2", "3"];
 * const statement = sql`
 *   SELECT COUNT(*)
 *   FROM process
 *   WHERE
 *     priority IN (${priorities})
 * `;
 * const count = await bulkGetCount(database, statement)
 * ```
 */
async function bulkGetCount<TParams extends unknown[] = unknown[]>(
	database: Database<TParams>,
	executeParams: BulkExecuteStatementParams<TParams>,
): Promise<number> {
	const results = await bulkDo<CountRow[], TParams>(database, executeParams, database.getRows);

	let totalCount = 0;

	for (const rows of results) {
		totalCount += rows[0]?.[countPropertyName] ?? 0;
	}

	return totalCount;
}

async function bulkDo<TData, TParams extends unknown[] = unknown[]>(
	database: Database<TParams>,
	{ statement, parameters, bulkParameters, bulkParametersIndex }: BulkExecuteStatementParams<TParams>,
	op: (statement: string, parameters: TParams) => Promise<TData>,
): Promise<TData[]> {
	if (bulkParameters.length === 0) {
		return [];
	}

	ensurePlaceholderCount(statement, parameters.length + 1);

	const parameterPlaceholderIndex = findNthPlaceholder(statement, bulkParametersIndex);
	const statementToLastPlaceholder = statement.slice(0, parameterPlaceholderIndex);
	const statementFromLastPlaceholder = statement.slice(parameterPlaceholderIndex + 1);
	const keysBeforeBulkKeys = parameters.slice(0, bulkParametersIndex) as TParams;
	const keysAfterBulkKeys = parameters.slice(bulkParametersIndex) as TParams;

	const chunkSize = database.MaxVariableNumber - parameters.length;
	const allBulkKeys = [...bulkParameters] as TParams;

	const promises: Promise<TData>[] = [];

	while (allBulkKeys.length > 0) {
		const chunkBulkKeys = allBulkKeys.splice(0, chunkSize) as TParams;
		const parametersStatement = Array.from({ length: chunkBulkKeys.length }).fill("?").join(",");
		const fullStatement = `${statementToLastPlaceholder}${parametersStatement}${statementFromLastPlaceholder}`;

		promises.push(op(fullStatement, [...keysBeforeBulkKeys, ...chunkBulkKeys, ...keysAfterBulkKeys] as TParams));
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

function findNthPlaceholder(statement: string, placeholderIndex: number): number {
	let position = 0;
	let currentIndex = -1;

	for (let i = 0; i <= placeholderIndex; i++) {
		currentIndex = statement.indexOf("?", position);

		if (currentIndex === -1) {
			return -1;
		}

		position = currentIndex + 1;
	}

	return currentIndex;
}

export type { BulkExecuteStatementParams, BulkStatementParams };

export { bulkExecuteCommand, bulkGetCount, bulkGetRows, bulkInsertEntities };
