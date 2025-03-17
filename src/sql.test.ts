import { type DefaultParamType, sql, sqlLiteral } from "./sql";

describe("sql", () => {
	it("returns correct type for normal statements", () => {
		// arrange
		const id = 1;

		// act
		const result = sql`
			SELECT
				column
			FROM the_table
			WHERE
				id = ${id}
			`;

		// assert
		expect(result).toHaveLength(2);
	});

	it("returns correct type for bulk execute statements", () => {
		// arrange
		const id = 1;
		const bulkIds = [1, 2, 3];

		// act
		const result = sql`
			SELECT
				column
			FROM the_table
			WHERE
				id = ${id}
				AND bulk_ids IN (${bulkIds})
			`;

		// assert
		expect(typeof result).toBe("object");
	});

	it("returns correct type for bulk statements", () => {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const getValues = (value: number[]): number[] => [value[0]!, value[1]!, value[2]!];

		// act
		const { statement, getParameters } = sql`
			INSERT INTO the_table (
				column_1
				, column_2
				, column_3
			) VALUES (${getValues})
			`;

		// assert
		expect(typeof statement).toBe("string");
		expect(typeof getParameters).toBe("function");
	});

	it("works without parameters", () => {
		// act
		const [statement, parameters] = sql`
			SELECT
				column
			FROM the_table
			`;

		// assert
		expect(statement).toBe(`
			SELECT
				column
			FROM the_table
			`);
		expect(parameters).toHaveLength(0);
	});

	it("works with parameters", () => {
		// arrange
		const id = 1;
		const value = "some value";

		// act
		const [statement, parameters] = sql`
			UPDATE the_table
			SET
				column = ${value}
			WHERE
				"id" = ${id}
			`;

		// assert
		expect(statement).toBe(`
			UPDATE the_table
			SET
				column = ?
			WHERE
				"id" = ?
			`);
		expect(parameters).toStrictEqual([value, id]);
	});

	it("works with bulk execute parameters", () => {
		// arrange
		const id = 1;
		const value = "some value";
		const bulkValues = [1, 2, 3];

		// act
		const { statement, parameters, bulkParameters } = sql`
			UPDATE the_table
			SET
				column = ${value}
			WHERE
				id = ${id}
				AND bulk_ids IN (${bulkValues})
			`;

		// assert
		expect(statement).toBe(`
			UPDATE the_table
			SET
				column = ?
			WHERE
				id = ?
				AND bulk_ids IN (?)
			`);
		expect(parameters).toStrictEqual([value, id]);
		expect(bulkParameters).toStrictEqual(bulkParameters);
	});

	it("works with bulk execute parameters even if bulk parameters is not the last parameter", () => {
		// arrange
		const id = 1;
		const value = "some value";
		const bulkValues = [1, 2, 3];

		// act
		const { statement, parameters, bulkParameters } = sql`
			UPDATE the_table
			SET
				column = ${value}
			WHERE
				bulk_ids IN (${bulkValues})
				AND id = ${id}
			`;

		// assert
		expect(statement).toBe(`
			UPDATE the_table
			SET
				column = ?
			WHERE
				bulk_ids IN (?)
				AND id = ?
			`);
		expect(parameters).toStrictEqual([value, id]);
		expect(bulkParameters).toStrictEqual(bulkParameters);
	});

	it("works with bulk parameters", () => {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const getValues = (value: number[]): DefaultParamType[] => [value[0]!, value[1]!, value[2]!];

		// act
		const { statement, getParameters } = sql`
			INSERT INTO the_table (
				column_1
				, column_2
				, column_3
			)
			VALUES (${getValues})
			`;

		// assert
		expect(statement).toBe(`
			INSERT INTO the_table (
				column_1
				, column_2
				, column_3
			)
			VALUES (?)
			`);
		expect(getParameters).toBe(getValues);
	});

	it("integrates a SQL statement into a new one", () => {
		// arrange
		const firstStatement = sql`
			FIRST STATEMENT
		`;

		// act
		const result = sql`
			${firstStatement}
			WHERE
				name = ${"name"}
		`;

		const [statement, parameters] = result;

		// assert
		expect(result).toHaveLength(2);
		expect(statement).toBe(`
			FIRST STATEMENT
			WHERE
				name = ?
		`);
		expect(parameters).toStrictEqual(["name"]);
	});

	it("integrates a SQL statement into a bulk statement", () => {
		// arrange
		const firstStatement = sql`
			FIRST STATEMENT
		`;

		// act
		const result = sql`
			${firstStatement}
			WHERE
				name = ${"name"}
				AND id IN (${[1, 2, 3]})
		`;

		const { statement, parameters, bulkParameters } = result;

		// assert
		expect(statement).toBe(`
			FIRST STATEMENT
			WHERE
				name = ?
				AND id IN (?)
		`);
		expect(parameters).toStrictEqual(["name"]);
		expect(bulkParameters).toStrictEqual([1, 2, 3]);
	});

	it("integrates an empty SQL statement into a new one", () => {
		// arrange
		const firstStatement = sql``;

		// act
		const [statement, parameters] = sql`
			${firstStatement}
			WHERE ...
		`;

		// assert
		expect(statement).toBe(`
			${""}
			WHERE ...
		`);
		expect(parameters).toStrictEqual([]);
	});

	it("integrates another SQL statement with parameters into a new one", () => {
		// arrange
		const firstStatementParam = "first";
		const secondStatementParam = "second";
		const firstStatement = sql`
			FIRST STATEMENT ${firstStatementParam} ${"literal value"}
		`;
		const secondStatement = sql`
			SECOND STATEMENT ${secondStatementParam}
		`;
		const param = "param";

		// act
		const [statement, parameters] = sql`
			${firstStatement}
			WHERE ${param}
			${secondStatement}
		`;

		// assert
		expect(statement).toBe(`
			FIRST STATEMENT ? ?
			WHERE ?
			SECOND STATEMENT ?
		`);
		expect(parameters).toStrictEqual([firstStatementParam, "literal value", param, secondStatementParam]);
	});

	it("inserts a SQL literal as is into the statement", () => {
		// arrange
		const literal = "value";

		// act
		const [statement, parameters] = sql`
			value like '${sqlLiteral(literal)}'
		`;

		// assert
		expect(statement).toBe(`
			value like 'value'
		`);
		expect(parameters).toStrictEqual([]);
	});
});
