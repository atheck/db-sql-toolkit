import type { BulkExecuteStatementParams, BulkStatementParams } from "./bulk";

type StatementParams = [string, unknown[]];

type ContainsArray<TArray> = TArray extends [infer TFirst, ...infer TRest]
	? TFirst extends unknown[]
		? TFirst extends StatementParams
			? ContainsArray<TRest>
			: TArray
		: ContainsArray<TRest>
	: never;

type FunctionParameter<TData> = [(data: TData) => unknown[]];

type ReturnType<TData extends unknown[]> = ContainsArray<TData> extends never
	? TData extends FunctionParameter<infer TParameter>
		? BulkStatementParams<TParameter>
		: StatementParams
	: BulkExecuteStatementParams;

function sql<TData extends unknown[]>(strings: TemplateStringsArray, ...values: TData): ReturnType<TData> {
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

	// biome-ignore lint/nursery/useAtIndex: TemplateStringsArray does not support at method
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

function isBulkExecute<TData extends unknown[]>(values: TData): values is ContainsArray<TData> {
	return values.some((value) => Array.isArray(value));
}

function createBulkExecuteParams(parameters: unknown[], statement: string): BulkExecuteStatementParams {
	const indexOfArray = parameters.findIndex((value) => Array.isArray(value));
	const array = parameters[indexOfArray];
	const copy = [...parameters];

	copy.splice(indexOfArray, 1);

	return {
		statement,
		parameters: copy,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		bulkParameters: array as unknown[],
		bulkParametersIndex: indexOfArray,
	};
}

function isBulkStatement<TData>(values: unknown[]): values is FunctionParameter<TData> {
	if (values.length > 0 && typeof values.at(-1) === "function") {
		return true;
	}

	return false;
}

function createBulkStatementParams<TData>(parameters: FunctionParameter<TData>, statement: string): BulkStatementParams<TData> {
	const lastValue = parameters[0];

	return {
		statement,
		getParameters: lastValue,
	};
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
