module.exports = {
	'**/*.js': [
		'npx eslint',
	],
	'**/*.md': [
		'npx markdownlint-cli',
	],
};
