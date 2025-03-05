import nodeWithBiome from "eslint-config-heck/nodeWithBiome";

const config = [
	...nodeWithBiome,
	{
		languageOptions: {
			sourceType: "module",
		},
	},
];

// biome-ignore lint/style/noDefaultExport: Required for ESLint configuration.
export default config;
