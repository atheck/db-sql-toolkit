import type { Database } from "./Database";
import { migrate } from "./migrate";

describe("migrate", () => {
	const database: Database = {
		// biome-ignore lint/style/useNamingConvention: Constant
		MaxVariableNumber: 10,
		executeSqlCommand: jest.fn(),
		getRows: jest.fn(),
	};

	it("does nothing if version is equal to target version", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);

		// act
		await migrate({
			database,
			targetVersion: 1,
			getCurrentVersion: mockGetVersion,
			updateVersion: mockUpdateVersion,
			migrationMap: [],
		});

		// assert
		expect(mockGetVersion).toHaveBeenCalledWith(database);
		expect(mockUpdateVersion).not.toHaveBeenCalled();
	});

	it("calls the correct migration and updates the version", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);

		// act
		await migrate({
			database,
			targetVersion: 2,
			getCurrentVersion: mockGetVersion,
			updateVersion: mockUpdateVersion,
			migrationMap: [[2, mockUpdateToVersion2]],
		});

		// assert
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockUpdateVersion).toHaveBeenCalledWith(database, 2);
	});

	it("calls multiple migrations and updates the version", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion3 = jest.fn().mockResolvedValue(null);

		// act
		await migrate({
			database,
			targetVersion: 3,
			getCurrentVersion: mockGetVersion,
			updateVersion: mockUpdateVersion,
			migrationMap: [
				[2, mockUpdateToVersion2],
				[3, mockUpdateToVersion3],
			],
		});

		// assert
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockUpdateToVersion3).toHaveBeenCalledWith(database);
		expect(mockUpdateVersion).toHaveBeenCalledWith(database, 3);
	});

	it("calls multiple migrations in the correct order", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion3 = jest.fn().mockResolvedValue(null);

		// act
		await migrate({
			database,
			targetVersion: 3,
			getCurrentVersion: mockGetVersion,
			updateVersion: mockUpdateVersion,
			migrationMap: [
				[3, mockUpdateToVersion3],
				[2, mockUpdateToVersion2],
			],
		});

		// assert
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockUpdateToVersion3).toHaveBeenCalledWith(database);
		expect(mockUpdateVersion).toHaveBeenCalledWith(database, 3);
	});

	it("calls required migrations only", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion3 = jest.fn().mockResolvedValue(null);

		// act
		await migrate({
			database,
			targetVersion: 2,
			getCurrentVersion: mockGetVersion,
			updateVersion: mockUpdateVersion,
			migrationMap: [
				[2, mockUpdateToVersion2],
				[3, mockUpdateToVersion3],
			],
		});

		// assert
		expect(mockUpdateToVersion2).toHaveBeenCalledWith(database);
		expect(mockUpdateToVersion3).not.toHaveBeenCalled();
		expect(mockUpdateVersion).toHaveBeenCalledWith(database, 2);
	});

	it("throws an error without migrations", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);

		// act
		const fails = async (): Promise<void> =>
			await migrate({
				database,
				targetVersion: 2,
				getCurrentVersion: mockGetVersion,
				updateVersion: mockUpdateVersion,
				migrationMap: [],
			});

		// assert
		await expect(fails).rejects.toThrow("Target version cannot be reached.");
	});

	it("throws an error if target version cannot be reached", async () => {
		// arrange
		const mockGetVersion = jest.fn().mockResolvedValue(1);
		const mockUpdateVersion = jest.fn().mockResolvedValue(null);
		const mockUpdateToVersion2 = jest.fn().mockResolvedValue(null);

		// act
		const fails = async (): Promise<void> =>
			await migrate({
				database,
				targetVersion: 3,
				getCurrentVersion: mockGetVersion,
				updateVersion: mockUpdateVersion,
				migrationMap: [[2, mockUpdateToVersion2]],
			});

		// assert
		await expect(fails).rejects.toThrow("Target version cannot be reached.");
	});
});
