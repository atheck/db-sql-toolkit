import type { BulkExecuteStatementParams, BulkStatementParams } from "./bulk";

type DefaultParamType = string | number | boolean | null;

type StatementParams<TParam = DefaultParamType> = [string, TParam[]];

type FunctionParameter<TData, TParam> = (data: TData) => TParam[];

type SqlReturnType<TData, TParam> =
	| StatementParams<TParam>
	| BulkStatementParams<TData, TParam>
	| BulkExecuteStatementParams<TParam>;

type AllowedSqlFnParam<TData, TParam> =
	| TParam
	| TParam[]
	| SqlLiteral
	| StatementParams<TParam>
	| FunctionParameter<TData, TParam>;

type StatementSqlFnParams<TParam> = (TParam | SqlLiteral | StatementParams<TParam>)[];
type BulkStatementSqlFnParams<TData, TParam> = [
	...(TParam | SqlLiteral | StatementParams<TParam>)[],
	FunctionParameter<TData, TParam>,
];
type BulkExecuteStatementSqlFnParams<TParam> = (TParam | TParam[] | SqlLiteral | StatementParams<TParam>)[];

type AllowedSqlParams<TData, TParam> = [
	...(TParam | TParam[] | SqlLiteral | StatementParams<TParam> | FunctionParameter<TData, TParam>)[],
];

function sql<TParam = DefaultParamType>(
	strings: TemplateStringsArray,
	...values: StatementSqlFnParams<NoInfer<TParam>>
): StatementParams<TParam>;
function sql<TData, TParam = DefaultParamType>(
	strings: TemplateStringsArray,
	...values: BulkStatementSqlFnParams<TData, NoInfer<TParam>>
): BulkStatementParams<TData, TParam>;
function sql<TParam = DefaultParamType>(
	strings: TemplateStringsArray,
	...values: BulkExecuteStatementSqlFnParams<NoInfer<TParam>>
): BulkExecuteStatementParams<TParam>;

function sql<TData, TParam = DefaultParamType>(
	strings: TemplateStringsArray,
	...values: AllowedSqlParams<TData, TParam>
): StatementParams<TParam> | BulkStatementParams<TData, TParam> | BulkExecuteStatementParams<TParam> {
	const statementParts: string[] = [];
	const parameters: AllowedSqlParams<TData, TParam> = [];

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

	if (isBulkStatement<TData, TParam>(parameters)) {
		return createBulkStatementParams<TData, TParam>(parameters, statement);
	}

	if (isBulkExecute(parameters)) {
		return createBulkExecuteParams(parameters, statement);
	}

	return [statement, parameters as TParam[]];
}

function isSqlLiteral(value: unknown): value is SqlLiteral {
	return typeof value === "object" && value !== null && "value" in value;
}

function isNestedStatement<TParam>(value: unknown): value is StatementParams<TParam> {
	if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && Array.isArray(value[1])) {
		return true;
	}

	return false;
}

function isBulkExecute<TData, TParam>(
	values: AllowedSqlFnParam<TData, TParam>[],
): values is BulkExecuteStatementSqlFnParams<TParam> {
	return values.some((value) => Array.isArray(value));
}

function createBulkExecuteParams<TParam>(
	parameters: BulkExecuteStatementSqlFnParams<TParam>,
	statement: string,
): BulkExecuteStatementParams<TParam> {
	const indexOfArray = parameters.findIndex((value) => Array.isArray(value));
	const array = parameters[indexOfArray] as TParam[];
	const copy = [...parameters] as TParam[];

	copy.splice(indexOfArray, 1);

	return {
		statement,
		parameters: copy,
		bulkParameters: array,
		bulkParametersIndex: indexOfArray,
	};
}

function isBulkStatement<TData, TParam>(
	values: AllowedSqlFnParam<TData, TParam>[],
): values is BulkStatementSqlFnParams<TData, TParam> {
	if (values.length > 0 && typeof values.at(-1) === "function") {
		return true;
	}

	return false;
}

function createBulkStatementParams<TData, TParam>(
	parameters: BulkStatementSqlFnParams<TData, TParam>,
	statement: string,
): BulkStatementParams<TData, TParam> {
	const lastValue = parameters.at(-1) as FunctionParameter<TData, TParam>;

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

export type {
	DefaultParamType,
	StatementParams,
	StatementSqlFnParams,
	BulkExecuteStatementSqlFnParams,
	BulkStatementSqlFnParams,
	SqlReturnType,
	AllowedSqlParams,
};

export { sql, sqlLiteral };
