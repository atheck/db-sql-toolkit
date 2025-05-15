import type { Database } from "./Database";
import { applyMigrations } from "./applyMigrations";

const MaxVariableNumber = 10;

describe("applyMigrations", () => {
	const database: Database = {
		MaxVariableNumber,
		executeSqlCommand: jest.fn(),
		getRows: jest.fn(),
	};

	it("does nothing if no migrations are given", async () => {
		// arrange
		const mockGetExecutedMigrationIds = jest.fn().mockResolvedValue([]);
		const mockInsertMigrationId = jest.fn().mockResolvedValue(null);

		// act
		await applyMigrations({
			database,
			getExecutedMigrationIds: mockGetExecutedMigrationIds,
			insertMigrationId: mockInsertMigrationId,
			migrations: [],
		});

		// assert
		expect(mockGetExecutedMigrationIds).toHaveBeenCalledWith(database);
		expect(mockInsertMigrationId).not.toHaveBeenCalled();
	});

	it("executes the correct migrations and writes their IDs", async () => {
		// arrange
		const mockGetExecutedMigrationIds = jest.fn().mockResolvedValue(["1"]);
		const mockInsertMigrationId = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion1 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);

		// act
		await applyMigrations({
			database,
			getExecutedMigrationIds: mockGetExecutedMigrationIds,
			insertMigrationId: mockInsertMigrationId,
			migrations: [
				{ id: "1", apply: mockUpdateToVersion1 },
				{ id: "2", apply: mockUpdateToVersion2 },
			],
		});

		// assert
		expect(mockUpdateToVersion1).not.toHaveBeenCalled();
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockInsertMigrationId).toHaveBeenCalledWith(database, "2");
	});

	it("executes multiple migrations and updates the version", async () => {
		// arrange
		const mockGetExecutedMigrationIds = jest.fn().mockResolvedValue([]);
		const mockInsertMigrationId = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion1 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);

		// act
		await applyMigrations({
			database,
			getExecutedMigrationIds: mockGetExecutedMigrationIds,
			insertMigrationId: mockInsertMigrationId,
			migrations: [
				{ id: "1", apply: mockUpdateToVersion1 },
				{ id: "2", apply: mockUpdateToVersion2 },
			],
		});

		// assert
		expect(mockUpdateToVersion1).toHaveBeenCalledWith(database);
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockInsertMigrationId).toHaveBeenNthCalledWith(1, database, "1");
		expect(mockInsertMigrationId).toHaveBeenNthCalledWith(2, database, "2");
	});

	it("calls required migrations only", async () => {
		// arrange
		const mockGetExecutedMigrationIds = jest.fn().mockResolvedValue(["1", "3"]);
		const mockInsertMigrationId = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion1 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion3 = jest.fn().mockResolvedValue(null);

		// act
		await applyMigrations({
			database,
			getExecutedMigrationIds: mockGetExecutedMigrationIds,
			insertMigrationId: mockInsertMigrationId,
			migrations: [
				{ id: "1", apply: mockUpdateToVersion1 },
				{ id: "2", apply: mockUpdateToVersion2 },
				{ id: "3", apply: mockUpdateToVersion3 },
			],
		});

		// assert
		expect(mockUpdateToVersion1).not.toHaveBeenCalled();
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockUpdateToVersion3).not.toHaveBeenCalled();
		expect(mockInsertMigrationId).toHaveBeenCalledWith(database, "2");
	});

	it("does not call apply or insertMigrationId if all migrations already executed", async () => {
		const mockGetExecutedMigrationIds = jest.fn().mockResolvedValue(["1", "2"]);
		const mockInsertMigrationId = jest.fn().mockResolvedValue(null);
		const mockApply1 = jest.fn().mockResolvedValue(null);
		const mockApply2 = jest.fn().mockResolvedValue(null);

		await applyMigrations({
			database,
			getExecutedMigrationIds: mockGetExecutedMigrationIds,
			insertMigrationId: mockInsertMigrationId,
			migrations: [
				{ id: "1", apply: mockApply1 },
				{ id: "2", apply: mockApply2 },
			],
		});

		expect(mockApply1).not.toHaveBeenCalled();
		expect(mockApply2).not.toHaveBeenCalled();
		expect(mockInsertMigrationId).not.toHaveBeenCalled();
	});

	it("writes logs if writeLog is provided", async () => {
		const mockGetExecutedMigrationIds = jest.fn().mockResolvedValue(["1", "2"]);
		const mockInsertMigrationId = jest.fn().mockResolvedValue(null);
		const mockApply = jest.fn().mockResolvedValue(null);
		const mockWriteLog = jest.fn();

		await applyMigrations({
			database,
			getExecutedMigrationIds: mockGetExecutedMigrationIds,
			insertMigrationId: mockInsertMigrationId,
			migrations: [{ id: "3", apply: mockApply }],
			writeLog: mockWriteLog,
		});

		expect(mockWriteLog).toHaveBeenCalledWith("Previously executed migrations: 1, 2");
		expect(mockWriteLog).toHaveBeenCalledWith('Executed migration "3"');
	});

	it("uses default getExecutedMigrationIds and insertMigrationId if not provided", async () => {
		const mockGetRows = jest.fn().mockResolvedValue([]);
		const mockExecuteSqlCommand = jest.fn().mockResolvedValue(null);
		const db: Database = {
			MaxVariableNumber,
			getRows: mockGetRows,
			executeSqlCommand: mockExecuteSqlCommand,
		};
		const mockApply = jest.fn().mockResolvedValue(null);

		await applyMigrations({
			database: db,
			migrations: [{ id: "abc", apply: mockApply }],
		});

		expect(mockGetRows).toHaveBeenCalledTimes(1);
		expect(mockExecuteSqlCommand).toHaveBeenCalledTimes(1);
		expect(mockApply).toHaveBeenCalledWith(db);
	});

	it("creates migration table if getRows throws and then applies migration", async () => {
		const mockGetRows = jest.fn().mockRejectedValue(new Error("no table"));
		const mockExecuteSqlCommand = jest.fn().mockResolvedValue(null);
		const db: Database = {
			MaxVariableNumber,
			getRows: mockGetRows,
			executeSqlCommand: mockExecuteSqlCommand,
		};
		const mockApply = jest.fn().mockResolvedValue(null);

		await applyMigrations({
			database: db,
			migrations: [{ id: "abc", apply: mockApply }],
		});

		expect(mockGetRows).toHaveBeenCalledTimes(1);
		expect(mockExecuteSqlCommand).toHaveBeenCalledTimes(2);
		expect(mockApply).toHaveBeenCalledWith(db);
	});
});
