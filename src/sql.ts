import { BulkExecuteStatementParams, BulkStatementParams } from "./bulk";

type StatementParams = [string, unknown[]];

type LastIsArray = [...unknown[], unknown[]];
type LastIsFunction<T> = [...unknown[], (data: T) => unknown[]];

function sql<T extends unknown[]>(
	strings: TemplateStringsArray,
	...values: T
): T extends LastIsArray
	? BulkExecuteStatementParams
	: T extends LastIsFunction<infer TData>
	? BulkStatementParams<TData>
	: StatementParams {
	// Typescript cannot infer the return type, that is why ts-expect-error comments are used.
	// However, at runtime the type is inferred correctly.

	const statementParts: string[] = [];
	const parameters: unknown[] = [];

	for (const [index, value] of values.entries()) {
		statementParts.push(strings[index] ?? "");

		if (isSqlLiteral(value)) {
			statementParts.push(value.value);
		} else if (isNestedStatement(value)) {
			const [subStatement, subParameters] = value;

			statementParts.push(subStatement.trim());
			parameters.push(...subParameters);
		} else {
			statementParts.push("?");
			parameters.push(value);
		}
	}

	// eslint-disable-next-line unicorn/prefer-at
	statementParts.push(strings[strings.length - 1] ?? "");

	const statement = statementParts.join("");

	if (isBulkExecute(parameters)) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		return createBulkExecuteParams(parameters, statement);
	}

	if (isBulkStatement(parameters)) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		return createBulkStatementParams(parameters, statement);
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	return [statement, parameters];
}

function isSqlLiteral(value: unknown): value is SqlLiteral {
	return typeof value === "object" && value !== null && "value" in value;
}

function isNestedStatement(value: unknown): value is StatementParams {
	if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && Array.isArray(value[1])) {
		return true;
	}

	return false;
}

function isBulkExecute(values: unknown[] | LastIsArray): values is LastIsArray {
	if (values.length > 0 && Array.isArray(values.at(-1))) {
		return true;
	}

	return false;
}

function createBulkExecuteParams(parameters: LastIsArray, statement: string): BulkExecuteStatementParams {
	const lastValue = parameters.at(-1);

	return [statement, parameters.slice(0, -1), lastValue as unknown[]];
}

function isBulkStatement<TData>(values: unknown[] | LastIsArray | LastIsFunction<TData>): values is LastIsFunction<TData> {
	if (values.length > 0 && typeof values.at(-1) === "function") {
		return true;
	}

	return false;
}

function createBulkStatementParams<TData>(parameters: LastIsFunction<TData>, statement: string): BulkStatementParams<TData> {
	const lastValue = parameters.at(-1);

	return [statement, lastValue as (data: TData) => unknown[]];
}

interface SqlLiteral {
	value: string;
}

function sqlLiteral(value: string): SqlLiteral {
	return {
		value,
	};
}

export type { StatementParams };

export { sql, sqlLiteral };
