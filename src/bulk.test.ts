import { type Database, countPropertyName } from "./Database";
import { bulkExecuteCommand, bulkGetCount, bulkGetRows, bulkInsertEntities } from "./bulk";
import { sql } from "./sql";

const mockDatabase: Database = {
	// biome-ignore lint/style/useNamingConvention: Constant
	MaxVariableNumber: 10,
	executeSqlCommand: jest.fn(async (): Promise<void> => undefined),
	getRows: jest.fn(),
};

interface Data {
	propA: number;
	propB: number;
	propC: number;
}

const testData: Data[] = [
	{
		propA: 1,
		propB: 2,
		propC: 3,
	},
	{
		propA: 4,
		propB: 5,
		propC: 6,
	},
	{
		propA: 7,
		propB: 8,
		propC: 9,
	},
	{
		propA: 10,
		propB: 11,
		propC: 12,
	},
];

describe("Helpers", () => {
	afterEach(jest.clearAllMocks);

	describe("bulkInsertEntities", () => {
		const getParameters = (data: Data): unknown[] => [data.propA, data.propB, data.propC];

		it("does nothing without data", async () => {
			// arrange
			const statement = "STATEMENT";

			// act
			await bulkInsertEntities(mockDatabase, [], { statement, getParameters });

			// assert
			expect(mockDatabase.executeSqlCommand).not.toHaveBeenCalled();
		});

		it("throws without parameter placeholders", async () => {
			// arrange
			const statement = "STATEMENT VALUES";

			// act
			const fails = async (): Promise<void> => await bulkInsertEntities(mockDatabase, testData, { statement, getParameters });

			// assert
			await expect(fails).rejects.toThrow("The number of placeholders does not match the parameters.");
		});

		it("throws if parameter placeholder count does not match", async () => {
			// arrange
			const statement = "STATEMENT ? VALUES (?)";

			// act
			const fails = async (): Promise<void> => await bulkInsertEntities(mockDatabase, testData, { statement, getParameters });

			// assert
			await expect(fails).rejects.toThrow("The number of placeholders does not match the parameters.");
		});

		it("works with few data", async () => {
			// arrange
			const statement = "STATEMENT VALUES (?)";

			// act
			await bulkInsertEntities(mockDatabase, testData.slice(0, 1), { statement, getParameters });

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledTimes(1);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT VALUES (?,?,?)", [1, 2, 3]);
		});

		it("works with more data", async () => {
			// arrange
			const statement = "STATEMENT VALUES (?)";

			// act
			await bulkInsertEntities(mockDatabase, testData.slice(0, 3), { statement, getParameters });

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledTimes(1);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith(
				"STATEMENT VALUES (?,?,?),(?,?,?),(?,?,?)",
				[1, 2, 3, 4, 5, 6, 7, 8, 9],
			);
		});

		it("works with many data", async () => {
			// arrange
			const statement = "STATEMENT VALUES (?)";

			// act
			await bulkInsertEntities(mockDatabase, testData, { statement, getParameters });

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledTimes(2);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith(
				"STATEMENT VALUES (?,?,?),(?,?,?),(?,?,?)",
				[1, 2, 3, 4, 5, 6, 7, 8, 9],
			);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT VALUES (?,?,?)", [10, 11, 12]);
		});

		it("does not modify the data", async () => {
			// arrange
			const statement = "STATEMENT VALUES (?)";

			// act
			await bulkInsertEntities(mockDatabase, testData, { statement, getParameters });

			// assert
			expect(testData).toHaveLength(4);
		});
	});

	describe("bulkExecuteCommand", () => {
		it("does nothing without bulk keys", async () => {
			// arrange
			const statement = "STATEMENT ?,?,?";
			const parameters = [1, 2, 3];
			const bulkParameters: unknown[] = [];

			// act
			await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: -1 });

			// assert
			expect(mockDatabase.executeSqlCommand).not.toHaveBeenCalled();
		});

		it("throws without parameter placeholders", async () => {
			// arrange
			const statement = "STATEMENT";
			const parameters = [1, 2, 3];
			const bulkParameters = [4, 5, 6];

			// act
			const fails = async (): Promise<void> =>
				await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: -1 });

			// assert
			await expect(fails).rejects.toThrow("The number of placeholders does not match the parameters.");
		});

		it("throws if parameter placeholder count does not match", async () => {
			// arrange
			const statement = "STATEMENT IN (?)";
			const parameters = [1, 2, 3];
			const bulkParameters = [4, 5, 6];

			// act
			const fails = async (): Promise<void> =>
				await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: -1 });

			// assert
			await expect(fails).rejects.toThrow("The number of placeholders does not match the parameters.");
		});

		it("works with few data", async () => {
			// arrange
			const statement = "STATEMENT ?,?,? IN (?)";
			const parameters = [1, 2, 3];
			const bulkParameters = [4, 5, 6];

			// act
			await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: 3 });

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledTimes(1);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT ?,?,? IN (?,?,?)", [1, 2, 3, 4, 5, 6]);
		});

		it("works with many data", async () => {
			// arrange
			const statement = "STATEMENT ?,?,? IN (?)";
			const parameters = [1, 2, 3];
			const bulkParameters = [4, 5, 6, 7, 8, 9, 10, 11, 12];

			// act
			await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: 3 });

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledTimes(2);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith(
				"STATEMENT ?,?,? IN (?,?,?,?,?,?,?)",
				[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			);
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT ?,?,? IN (?,?)", [1, 2, 3, 11, 12]);
		});

		it("does not modify the data", async () => {
			// arrange
			const statement = "STATEMENT ?,?,? IN (?)";
			const parameters = [1, 2, 3];
			const bulkParameters = [4, 5, 6, 7, 8, 9, 10, 11, 12];

			// act
			await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: 3 });

			// assert
			expect(bulkParameters).toHaveLength(9);
		});
	});

	describe("bulkGetRows", () => {
		it("concatenates all results", async () => {
			// arrange
			const statement = "STATEMENT ?,?,? IN (?)";
			const parameters = [1, 2, 3];
			// more than 10 variables
			const bulkParameters = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

			jest.mocked(mockDatabase.getRows).mockResolvedValueOnce([1, 2, 3]);
			jest.mocked(mockDatabase.getRows).mockResolvedValueOnce([4, 5, 6]);

			// act
			const result = await bulkGetRows(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: 3 });

			// assert
			expect(result).toStrictEqual([1, 2, 3, 4, 5, 6]);
		});
	});

	describe("bulkGetCount", () => {
		it("sums up all counts", async () => {
			// arrange
			const statement = "SELECT COUNT(*) IN (?)";
			// more than 20 variables
			const bulkParameters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
			const mockGetRows = jest.mocked(mockDatabase.getRows);

			mockGetRows
				.mockResolvedValueOnce([{ [countPropertyName]: 5 }])
				// Only takes the first result row
				.mockResolvedValueOnce([{ [countPropertyName]: 12 }, { [countPropertyName]: 1 }])
				// Zero without a result row
				.mockResolvedValueOnce([]);

			// act
			const result = await bulkGetCount(mockDatabase, { statement, parameters: [], bulkParameters, bulkParametersIndex: 0 });

			// assert
			expect(result).toBe(17);
		});
	});

	describe("bulkDo", () => {
		it("replaces the placeholder for the bulk keys correctly", async () => {
			// arrange
			const statement = "STATEMENT ? IN (?)";
			const parameters = [1];
			const bulkParameters = [4, 5, 6];

			// act
			await bulkExecuteCommand(mockDatabase, { statement, parameters, bulkParameters, bulkParametersIndex: 1 });

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT ? IN (?,?,?)", [1, 4, 5, 6]);
		});

		it("replaces the last placeholder when using sql function", async () => {
			// arrange
			const statement = sql`STATEMENT ${1} IN (${[1, 2, 3]})`;

			// act
			await bulkExecuteCommand(mockDatabase, statement);

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT ? IN (?,?,?)", [1, 1, 2, 3]);
		});

		it("replaces the correct placeholder at the beginning when using sql function", async () => {
			// arrange
			const statement = sql`STATEMENT (${[1, 2, 3]}) IN ${1}`;

			// act
			await bulkExecuteCommand(mockDatabase, statement);

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT (?,?,?) IN ?", [1, 2, 3, 1]);
		});

		it("replaces the correct placeholder in the middle when using sql function", async () => {
			// arrange
			const statement = sql`STATEMENT ${0} (${[1, 2, 3]}) IN ${1}`;

			// act
			await bulkExecuteCommand(mockDatabase, statement);

			// assert
			expect(mockDatabase.executeSqlCommand).toHaveBeenCalledWith("STATEMENT ? (?,?,?) IN ?", [0, 1, 2, 3, 1]);
		});
	});
});
