import assert from 'node:assert/strict';
import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import svelteConfig from './apps/web/svelte.config.js';
import { readJSON } from './tooling/checks/io.mjs';

const policy = readJSON(new URL('./tooling/checks/contracts/lint.json', import.meta.url));
const svelteBase = svelte.configs['flat/base'];
const component = svelteBase.find((config) => config.name === 'svelte:base:setup-for-svelte');
const script = svelteBase.find((config) => config.name === 'svelte:base:setup-for-svelte-script');
assert.ok(component?.languageOptions?.parser && script?.languageOptions?.parser);
const selected = Object.fromEntries(
	Object.entries(js.configs.recommended.rules).filter(([name]) => Object.hasOwn(policy.rules, name))
);
const rules = { ...selected, ...policy.rules };
const extensions = '{js,mjs,cjs,ts,svelte}';

export default [
	{ ignores: [...policy.generatedExclusions, 'tooling/migration/**'] },
	prettier,
	{
		files: policy.files,
		linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
		languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
		rules
	},
	{ files: ['**/*.{js,mjs,cjs}'], rules: policy.jsOnlyRules },
	{ files: ['**/*.ts'], languageOptions: { parser: ts.parser } },
	{ files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
	{
		files: [
			`tooling/**/*.${extensions}`,
			`*.${extensions}`,
			`apps/web/*config*.${extensions}`,
			`apps/web/scripts/**/*.${extensions}`
		],
		languageOptions: { globals: globals.node }
	},
	{
		files: [`packages/notfeed/src/**/*.${extensions}`, `apps/web/src/routes/**/*.${extensions}`],
		languageOptions: { globals: globals.browser }
	},
	{
		files: ['apps/web/src/service-worker.{js,ts}'],
		languageOptions: { globals: globals.serviceworker }
	},
	{
		files: ['**/*.svelte'],
		plugins: { svelte },
		processor: component.processor,
		languageOptions: {
			parser: component.languageOptions.parser,
			parserOptions: { parser: ts.parser, svelteConfig, extraFileExtensions: ['.svelte'] }
		}
	},
	{
		files: ['**/*.svelte.{js,ts}'],
		plugins: { svelte },
		languageOptions: {
			parser: script.languageOptions.parser,
			parserOptions: { parser: ts.parser, svelteConfig, extraFileExtensions: ['.svelte'] }
		}
	}
];
