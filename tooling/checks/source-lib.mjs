import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { hash } from './io.mjs';

export function inspectDebt(file, source) {
	const result = [],
		sections = [],
		printer = ts.createPrinter({ removeComments: true });
	if (file.endsWith('.svelte')) {
		const component = parse(source, { modern: true });
		for (const script of [component.instance, component.module].filter(Boolean)) {
			const start = source.indexOf('>', script.start) + 1;
			sections.push({
				source: source.slice(start, source.lastIndexOf('</script', script.end)),
				offset: start
			});
		}
		function comments(node) {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'Comment' && /svelte-ignore/.test(node.data))
				result.push({
					kind: 'suppression',
					anchor: hash(node.data.trim()),
					owner: 'template',
					line: source.slice(0, node.start).split('\n').length
				});
			for (const value of Object.values(node)) {
				if (Array.isArray(value)) value.forEach(comments);
				else if (value && typeof value === 'object') comments(value);
			}
		}
		comments(component.fragment);
	} else sections.push({ source, offset: 0 });
	for (const section of sections) {
		const tree = ts.createSourceFile(
			file.endsWith('.svelte') ? `${file}.ts` : file,
			section.source,
			ts.ScriptTarget.Latest,
			true
		);
		function visit(node) {
			const kind =
				node.kind === ts.SyntaxKind.AnyKeyword
					? 'any'
					: ts.isAsExpression(node) && ts.isAsExpression(node.expression)
						? 'double-cast'
						: null;
			if (kind) {
				const owners = [];
				for (let current = node.parent; current; current = current.parent)
					if (
						current.name &&
						(ts.isFunctionLike(current) ||
							ts.isVariableDeclaration(current) ||
							ts.isClassDeclaration(current) ||
							ts.isTypeAliasDeclaration(current))
					)
						owners.push(current.name.getText(tree));
				const owner = owners.join('/') || 'module';
				const syntax = printer
					.printNode(ts.EmitHint.Unspecified, node.parent, tree)
					.replace(/\s+/g, ' ')
					.trim();
				result.push({
					kind,
					owner,
					syntax,
					anchor: hash(`${kind}:${owner}:${syntax}`),
					line: source.slice(0, section.offset + node.getStart(tree)).split('\n').length
				});
			}
			ts.forEachChild(node, visit);
		}
		visit(tree);
		const scanner = ts.createScanner(
			ts.ScriptTarget.Latest,
			false,
			ts.LanguageVariant.Standard,
			section.source
		);
		for (
			let token = scanner.scan();
			token !== ts.SyntaxKind.EndOfFileToken;
			token = scanner.scan()
		) {
			if (
				![ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia].includes(
					token
				)
			)
				continue;
			const text = scanner.getTokenText();
			if (/@ts-(?:ignore|nocheck|expect-error)|eslint-disable|svelte-ignore/.test(text))
				result.push({
					kind: 'suppression',
					owner: 'script-comment',
					anchor: hash(text.replace(/\s+/g, ' ').trim()),
					line: source.slice(0, section.offset + scanner.getTokenPos()).split('\n').length
				});
		}
	}
	return result;
}
export function inspectImports(file, source, { allowComputed = false } = {}) {
	const sections = [];
	if (file.endsWith('.svelte')) {
		const component = parse(source, { modern: true });
		for (const script of [component.instance, component.module].filter(Boolean))
			sections.push(
				source.slice(
					source.indexOf('>', script.start) + 1,
					source.lastIndexOf('</script', script.end)
				)
			);
	} else sections.push(source);
	const imports = [];
	for (const section of sections) {
		const tree = ts.createSourceFile(
			file.endsWith('.svelte') ? `${file}.ts` : file,
			section,
			ts.ScriptTarget.Latest,
			true
		);
		function add(node) {
			if (allowComputed && node && !ts.isStringLiteralLike(node)) return;
			assert.ok(node && ts.isStringLiteralLike(node), `${file}: import calculado`);
			imports.push(node.text);
		}
		function visit(node) {
			if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
				add(node.moduleSpecifier);
			if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
				add(node.argument.literal);
			if (
				ts.isCallExpression(node) &&
				(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
					node.expression.getText(tree) === 'require')
			)
				add(node.arguments[0]);
			ts.forEachChild(node, visit);
		}
		visit(tree);
	}
	return imports;
}
export function semanticHash(source) {
	const scanner = ts.createScanner(
		ts.ScriptTarget.Latest,
		true,
		ts.LanguageVariant.Standard,
		source
	);
	const tokens = [];
	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
		tokens.push([token, scanner.getTokenValue() ?? scanner.getTokenText()]);
	return hash(JSON.stringify(tokens));
}
export function assertSourceEdge(from, specifier, target) {
	assert.ok(!specifier.startsWith('$lib'), `${from}: alias antigo`);
	if (from.startsWith('packages/'))
		assert.ok(!target.startsWith('apps/'), `${from}: pacote importa aplicativo`);
	if (/^(apps\/web|packages)\//.test(from))
		assert.ok(!/^(tooling|docs|apps\/desktop)\//.test(target), `${from}: import fora do grafo`);
}
export function assertDebtBudget(reference, current) {
	const key = (entry) => `${entry.file}\0${entry.kind}\0${entry.owner}\0${entry.anchor}`;
	const counts = new Map();
	for (const entry of reference) counts.set(key(entry), (counts.get(key(entry)) ?? 0) + 1);
	for (const entry of current) {
		const identity = key(entry),
			remaining = counts.get(identity) ?? 0;
		assert.ok(
			remaining > 0,
			`nova ocorrência de tipo/supressão: ${entry.file} ${entry.kind} ${entry.owner}`
		);
		counts.set(identity, remaining - 1);
	}
}
export function expectedNodeTests(files) {
	return files.flatMap((file) => {
		const names = [],
			tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
		function visit(node) {
			if (ts.isCallExpression(node) && node.expression.getText(tree) === 'test') {
				assert.ok(
					ts.isStringLiteralLike(node.arguments[0]),
					`${file}: teste sem identidade literal`
				);
				names.push(node.arguments[0].text);
			}
			ts.forEachChild(node, visit);
		}
		visit(tree);
		assert.ok(names.length, `${file}: nenhum teste`);
		return names;
	});
}
export function readCompilerConfig(configFile) {
	const absolute = path.resolve(configFile);
	const config = ts.readConfigFile(absolute, ts.sys.readFile);
	assert.ok(!config.error, 'tsconfig ilegível');
	return ts.parseJsonConfigFileContent(
		config.config,
		ts.sys,
		path.dirname(absolute),
		undefined,
		absolute,
		undefined,
		[{ extension: '.svelte', isMixedContent: true, scriptKind: ts.ScriptKind.Deferred }]
	);
}
export function assertCheckCoverage(configFile, sources, additionalConfigs = []) {
	const included = new Set(
		[configFile, ...additionalConfigs]
			.flatMap((file) => readCompilerConfig(file).fileNames)
			.map((file) => path.resolve(file))
	);
	for (const file of sources)
		assert.ok(included.has(path.resolve(file)), `${file}: fonte omitida do check`);
}

export function assertVitestCoverage(source, sources, root) {
	const tree = ts.createSourceFile('vitest.config.ts', source, ts.ScriptTarget.Latest, true);
	const includes = [];
	function visit(node) {
		if (ts.isPropertyAssignment(node)) {
			const name = node.name.getText(tree).replace(/^['"]|['"]$/g, '');
			assert.notEqual(name, 'exclude', 'exclusão Vitest fora do contrato');
			if (name === 'include') {
				assert.ok(ts.isArrayLiteralExpression(node.initializer));
				for (const entry of node.initializer.elements) {
					assert.ok(ts.isStringLiteralLike(entry));
					includes.push(entry.text);
				}
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(tree);
	assert.ok(includes.length && sources.length, 'descoberta de testes vazia');
	const included = new Set(
		ts.sys
			.readDirectory(path.resolve(root), ['.ts'], undefined, includes)
			.map((file) => path.resolve(file))
	);
	for (const file of sources)
		assert.ok(included.has(path.resolve(file)), `teste omitido do Vitest: ${file}`);
}

export function assertNoTestShortcuts(file, source) {
	const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
	function visit(node) {
		if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
			const name = ts.isPropertyAccessExpression(node)
				? node.name.text
				: ts.isStringLiteralLike(node.argumentExpression)
					? node.argumentExpression.text
					: '';
			if (/^(test|it|describe)(?:\b|\.)/.test(node.expression.getText(tree)))
				assert.ok(
					!['skip', 'todo', 'only'].includes(name),
					`${file}: atalho de teste proibido ${name}`
				);
		}
		ts.forEachChild(node, visit);
	}
	visit(tree);
}
