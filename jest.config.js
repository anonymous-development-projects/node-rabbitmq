// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
	globals: {
		'ts-jest': {
			diagnostics: false,
			ignoreCoverageForDecorators: true,
			ignoreCoverageForAllDecorators: true,
		},
	},
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
	],
	modulePathIgnorePatterns: [
		'/node_modules/',
		'/.gitlab/',
		'/.hooks/',
		'/envs/',
	],
	roots: [
		'<rootDir>/src/',
	],
	testRegex: ".spec.ts$",
	preset: 'ts-jest',
}
