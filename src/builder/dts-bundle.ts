import { writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import glob from "fast-glob";
import { logger } from "../shared/logger.js";

export interface DtsBundleOptions {
  /** Directory containing generated .d.ts files */
  outDir: string;
  /** Entry .d.ts file names (relative to outDir), e.g. ["index.d.ts"] */
  entries: string[];
  /** Also resolve types from external packages into the bundle */
  resolveExternals?: boolean;
}

// Cached typescript module
let tsModule: typeof import("typescript") | null = null;

async function loadTypeScript(): Promise<typeof import("typescript")> {
  if (tsModule) return tsModule;
  tsModule = await import("typescript");
  return tsModule;
}

/** Reset the cached TypeScript module (useful in watch mode after TS upgrades). */
export function resetTypeScriptCache(): void {
  tsModule = null;
}

/**
 * Bundle per-file .d.ts output into single-file declarations per entry.
 *
 * Uses TypeScript Compiler API for accurate symbol resolution,
 * type tree-shaking, and collision detection.
 */
export async function bundleDts(options: DtsBundleOptions): Promise<void> {
  const { outDir, entries, resolveExternals = false } = options;

  // Gather all .d.ts files once and reuse for both bundling and cleanup
  const allDtsFiles = await glob("**/*.d.ts", { cwd: resolve(outDir), absolute: true });

  for (const entryName of entries) {
    const entryPath = join(outDir, entryName);
    try {
      const bundled = await bundleSingleEntry(entryPath, outDir, resolveExternals, allDtsFiles);
      await writeFile(entryPath, bundled);
    } catch (err) {
      logger.verbose(`[dts-bundle] ${entryPath}: ${err instanceof Error ? err.message : String(err)}`);
      logger.warn(
        `DTS bundling failed for ${entryName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Clean up non-entry .d.ts files that were inlined
  await cleanInlinedFiles(outDir, entries, allDtsFiles);
}

/** Module classification for imports/exports */
const enum ModuleKind {
  /** Local file within outDir — inline its declarations */
  Inline,
  /** External package — preserve import/export */
  Import,
  /** @types/* package — triple-slash reference */
  Reference,
}

interface CollectedDeclaration {
  node: import("typescript").Node;
  sourceFile: import("typescript").SourceFile;
  symbol: import("typescript").Symbol | undefined;
  isExported: boolean;
}

interface RenamedExport {
  symbol: import("typescript").Symbol;
  alias: string;
  isTypeOnly: boolean;
}

interface BundleContext {
  ts: typeof import("typescript");
  checker: import("typescript").TypeChecker;
  program: import("typescript").Program;
  outDir: string;
  resolveExternals: boolean;
  visited: Set<string>;
  /** Collected declaration nodes in dependency order */
  declarations: CollectedDeclaration[];
  /** External import/export lines to preserve */
  externalImports: Set<string>;
  /** Triple-slash references */
  tripleSlashRefs: Set<string>;
  /** declare module blocks */
  ambientModules: Array<{ node: import("typescript").Node; sourceFile: import("typescript").SourceFile }>;
  /** Symbols exported from the entry file */
  entryExportSymbols: Set<import("typescript").Symbol>;
  /** All collected symbols (for dedup) */
  collectedSymbols: Set<import("typescript").Symbol>;
  /** Renamed exports: entries with alias and type-only tracking */
  renamedExports: RenamedExport[];
  /** Collision resolver: symbol -> resolved name (only populated for renamed symbols) */
  renameMap: Map<import("typescript").Symbol, string>;
  /** Tracks all names claimed to detect collisions: name -> symbol */
  claimedNames: Map<string, import("typescript").Symbol>;
  /** Type-only exported symbols (from `export type { ... }`) */
  typeOnlyExports: Set<import("typescript").Symbol>;
}

async function bundleSingleEntry(
  entryPath: string,
  outDir: string,
  resolveExternals: boolean,
  allDtsFiles: string[],
): Promise<string> {
  const ts = await loadTypeScript();

  const resolvedEntry = resolve(entryPath);
  const resolvedOutDir = resolve(outDir);

  // Create a TS program over the .d.ts files
  const compilerOptions: import("typescript").CompilerOptions = {
    declaration: true,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.Node16,
    rootDir: resolvedOutDir,
    baseUrl: resolvedOutDir,
    skipLibCheck: true,
  };

  const program = ts.createProgram(allDtsFiles, compilerOptions);
  const checker = program.getTypeChecker();

  const entrySourceFile = program.getSourceFile(resolvedEntry);
  if (!entrySourceFile) {
    throw new Error(`Entry file not found in program: ${entryPath}`);
  }

  const ctx: BundleContext = {
    ts,
    checker,
    program,
    outDir: resolvedOutDir,
    resolveExternals,
    visited: new Set(),
    declarations: [],
    externalImports: new Set(),
    tripleSlashRefs: new Set(),
    ambientModules: [],
    entryExportSymbols: new Set(),
    collectedSymbols: new Set(),
    renamedExports: [],
    renameMap: new Map(),
    claimedNames: new Map(),
    typeOnlyExports: new Set(),
  };

  // Gather entry exports for tree-shaking
  const entrySymbol = checker.getSymbolAtLocation(entrySourceFile);
  if (entrySymbol) {
    const exports = checker.getExportsOfModule(entrySymbol);
    for (const exp of exports) {
      ctx.entryExportSymbols.add(resolveAlias(ts, checker, exp));
    }
  }

  // Collect declarations recursively
  collectFromFile(ctx, entrySourceFile, true);

  // Tree-shake unreachable declarations
  const reachable = buildReachableSet(ctx);

  // Filter declarations to only reachable ones
  const filteredDecls = ctx.declarations.filter((d) => {
    if (!d.symbol) return true; // keep declarations without symbols (e.g. augmentations)
    return reachable.has(d.symbol);
  });

  // Detect and resolve name collisions
  resolveCollisions(ctx, filteredDecls);

  // Emit the bundled output
  return emitBundle(ctx, filteredDecls);
}

function resolveAlias(
  ts: typeof import("typescript"),
  checker: import("typescript").TypeChecker,
  symbol: import("typescript").Symbol,
): import("typescript").Symbol {
  while (symbol.flags & ts.SymbolFlags.Alias) {
    const aliased = checker.getAliasedSymbol(symbol);
    if (aliased === symbol) break;
    symbol = aliased;
  }
  return symbol;
}

function classifyModule(
  ctx: BundleContext,
  specifier: string,
  containingFile: string,
): ModuleKind {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return ModuleKind.Inline;
  }

  if (specifier.startsWith("@types/")) {
    return ModuleKind.Reference;
  }

  if (ctx.resolveExternals) {
    const resolved = ctx.ts.resolveModuleName(
      specifier,
      containingFile,
      { moduleResolution: ctx.ts.ModuleResolutionKind.Node16, target: ctx.ts.ScriptTarget.ESNext },
      ctx.ts.sys,
    );
    if (resolved.resolvedModule?.resolvedFileName.endsWith(".d.ts")) {
      return ModuleKind.Inline;
    }
  }

  return ModuleKind.Import;
}

function resolveLocalModule(
  ctx: BundleContext,
  specifier: string,
  containingFile: string,
): import("typescript").SourceFile | undefined {
  const resolved = ctx.ts.resolveModuleName(
    specifier,
    containingFile,
    {
      moduleResolution: ctx.ts.ModuleResolutionKind.Node16,
      target: ctx.ts.ScriptTarget.ESNext,
      module: ctx.ts.ModuleKind.Node16,
      rootDir: ctx.outDir,
      baseUrl: ctx.outDir,
    },
    ctx.ts.sys,
  );
  if (resolved.resolvedModule) {
    return ctx.program.getSourceFile(resolved.resolvedModule.resolvedFileName);
  }
  return undefined;
}

function collectFromFile(
  ctx: BundleContext,
  sourceFile: import("typescript").SourceFile,
  _isEntry: boolean,
): void {
  const resolved = resolve(sourceFile.fileName);
  if (ctx.visited.has(resolved)) return;
  ctx.visited.add(resolved);

  const { ts, checker } = ctx;

  // Collect triple-slash references
  for (const ref of sourceFile.referencedFiles) {
    ctx.tripleSlashRefs.add(ref.fileName);
  }
  for (const ref of sourceFile.typeReferenceDirectives) {
    ctx.tripleSlashRefs.add(ref.fileName);
  }

  for (const stmt of sourceFile.statements) {
    // import = require("...") declarations
    if (ts.isImportEqualsDeclaration(stmt) && stmt.moduleReference && ts.isExternalModuleReference(stmt.moduleReference)) {
      const expr = stmt.moduleReference.expression;
      if (ts.isStringLiteral(expr)) {
        const specifier = expr.text;
        const kind = classifyModule(ctx, specifier, sourceFile.fileName);
        if (kind === ModuleKind.Inline) {
          const targetSf = resolveLocalModule(ctx, specifier, sourceFile.fileName);
          if (targetSf) {
            collectFromFile(ctx, targetSf, false);
          }
        } else if (kind === ModuleKind.Reference) {
          const typeName = specifier.startsWith("@types/") ? specifier.slice(7) : specifier;
          ctx.tripleSlashRefs.add(typeName);
        } else {
          ctx.externalImports.add(stmt.getText(sourceFile));
        }
        continue;
      }
    }

    // import declarations
    if (ts.isImportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const specifier = stmt.moduleSpecifier.text;
      const kind = classifyModule(ctx, specifier, sourceFile.fileName);

      if (kind === ModuleKind.Inline) {
        const targetSf = resolveLocalModule(ctx, specifier, sourceFile.fileName);
        if (targetSf) {
          collectFromFile(ctx, targetSf, false);
        }
        // Import clause symbols are now inlined — skip the import statement
      } else if (kind === ModuleKind.Reference) {
        const typeName = specifier.startsWith("@types/") ? specifier.slice(7) : specifier;
        ctx.tripleSlashRefs.add(typeName);
      } else {
        ctx.externalImports.add(stmt.getText(sourceFile));
      }
      continue;
    }

    // export declarations with module specifier
    if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const specifier = stmt.moduleSpecifier.text;
      const kind = classifyModule(ctx, specifier, sourceFile.fileName);

      if (kind === ModuleKind.Inline) {
        const targetSf = resolveLocalModule(ctx, specifier, sourceFile.fileName);
        if (targetSf) {
          if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
            // export { X, Y } from "./local" or export type { X } from "./local"
            collectFromFile(ctx, targetSf, false);
            const stmtIsTypeOnly = stmt.isTypeOnly;
            for (const el of stmt.exportClause.elements) {
              const sym = checker.getSymbolAtLocation(el.name);
              if (sym) {
                const resolvedSym = resolveAlias(ts, checker, sym);
                ctx.entryExportSymbols.add(resolvedSym);
                const elIsTypeOnly = stmtIsTypeOnly || el.isTypeOnly;
                if (elIsTypeOnly) {
                  ctx.typeOnlyExports.add(resolvedSym);
                }
                if (el.propertyName) {
                  // export { Original as Renamed } or export type { Original as Renamed }
                  ctx.renamedExports.push({
                    symbol: resolvedSym,
                    alias: el.name.text,
                    isTypeOnly: elIsTypeOnly,
                  });
                }
              }
            }
          } else {
            // export * from "./local"
            collectFromFile(ctx, targetSf, false);
            const targetSymbol = checker.getSymbolAtLocation(targetSf);
            if (targetSymbol) {
              const targetExports = checker.getExportsOfModule(targetSymbol);
              for (const exp of targetExports) {
                ctx.entryExportSymbols.add(resolveAlias(ts, checker, exp));
              }
            }
          }
        }
      } else if (kind === ModuleKind.Reference) {
        const typeName = specifier.startsWith("@types/") ? specifier.slice(7) : specifier;
        ctx.tripleSlashRefs.add(typeName);
      } else {
        ctx.externalImports.add(stmt.getText(sourceFile));
      }
      continue;
    }

    // export assignment: export = X or export default X
    if (ts.isExportAssignment(stmt)) {
      const sym = checker.getSymbolAtLocation(stmt.expression);
      if (sym) {
        ctx.entryExportSymbols.add(resolveAlias(ts, checker, sym));
      }
      ctx.declarations.push({
        node: stmt,
        sourceFile,
        symbol: sym ? resolveAlias(ts, checker, sym) : undefined,
        isExported: true,
      });
      continue;
    }

    // declare module "..." — ambient module
    if (ts.isModuleDeclaration(stmt) && ts.isStringLiteral(stmt.name)) {
      ctx.ambientModules.push({ node: stmt, sourceFile });
      continue;
    }

    // Regular declarations (interface, type, class, function, const, enum, namespace)
    if (isDeclarationStatement(ts, stmt)) {
      const name = getDeclarationName(ts, stmt);
      const sym = name ? checker.getSymbolAtLocation(name) : undefined;
      const resolvedSym = sym ? resolveAlias(ts, checker, sym) : undefined;

      if (resolvedSym && ctx.collectedSymbols.has(resolvedSym)) {
        // Already collected (e.g., declaration merging — collect additional declarations)
        const existing = ctx.declarations.find(d => d.symbol === resolvedSym);
        if (existing && existing.node !== stmt) {
          ctx.declarations.push({
            node: stmt,
            sourceFile,
            symbol: resolvedSym,
            isExported: hasExportModifier(ts, stmt),
          });
        }
        continue;
      }

      if (resolvedSym) {
        ctx.collectedSymbols.add(resolvedSym);
      }

      const isExported = hasExportModifier(ts, stmt);
      ctx.declarations.push({
        node: stmt,
        sourceFile,
        symbol: resolvedSym,
        isExported,
      });
      continue;
    }

    // export { X, Y } (without from) — local re-exports
    // also handles: export type { X, Y }
    if (ts.isExportDeclaration(stmt) && !stmt.moduleSpecifier && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      const stmtIsTypeOnly = stmt.isTypeOnly;
      for (const el of stmt.exportClause.elements) {
        const sym = checker.getSymbolAtLocation(el.name);
        if (sym) {
          const resolvedSym = resolveAlias(ts, checker, sym);
          ctx.entryExportSymbols.add(resolvedSym);
          const elIsTypeOnly = stmtIsTypeOnly || el.isTypeOnly;
          if (elIsTypeOnly) {
            ctx.typeOnlyExports.add(resolvedSym);
          }
          if (el.propertyName) {
            ctx.renamedExports.push({
              symbol: resolvedSym,
              alias: el.name.text,
              isTypeOnly: elIsTypeOnly,
            });
          }
        }
      }
      continue;
    }
  }
}

function isDeclarationStatement(
  ts: typeof import("typescript"),
  node: import("typescript").Node,
): node is import("typescript").DeclarationStatement {
  return (
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isVariableStatement(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node)
  );
}

function getDeclarationName(
  ts: typeof import("typescript"),
  node: import("typescript").Node,
): import("typescript").Node | undefined {
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations[0];
    return decl?.name;
  }
  if ("name" in node && node.name) {
    return node.name as import("typescript").Node;
  }
  return undefined;
}

function hasExportModifier(
  ts: typeof import("typescript"),
  node: import("typescript").Node,
): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/**
 * Build set of symbols reachable from entry exports.
 * Walks type references transitively.
 */
function buildReachableSet(ctx: BundleContext): Set<import("typescript").Symbol> {
  const { ts, checker } = ctx;
  const reachable = new Set<import("typescript").Symbol>();
  const queue = [...ctx.entryExportSymbols];

  while (queue.length > 0) {
    const sym = queue.pop()!;
    if (reachable.has(sym)) continue;
    reachable.add(sym);

    const decls = sym.getDeclarations();
    if (!decls) continue;

    for (const decl of decls) {
      walkNodeForSymbolRefs(ts, checker, decl, (refSym) => {
        const resolved = resolveAlias(ts, checker, refSym);
        if (!reachable.has(resolved) && ctx.collectedSymbols.has(resolved)) {
          queue.push(resolved);
        }
      });
    }
  }

  return reachable;
}

function walkNodeForSymbolRefs(
  ts: typeof import("typescript"),
  checker: import("typescript").TypeChecker,
  node: import("typescript").Node,
  cb: (sym: import("typescript").Symbol) => void,
): void {
  if (ts.isIdentifier(node) || ts.isQualifiedName(node)) {
    const sym = checker.getSymbolAtLocation(node);
    if (sym) cb(sym);
  }
  ts.forEachChild(node, (child) => walkNodeForSymbolRefs(ts, checker, child, cb));
}

/**
 * Detect name collisions and populate renameMap.
 */
function resolveCollisions(
  ctx: BundleContext,
  declarations: CollectedDeclaration[],
): void {
  for (const decl of declarations) {
    if (!decl.symbol) continue;
    const name = decl.symbol.getName();
    if (!name || name === "default" || name === "__export") continue;

    const existing = ctx.claimedNames.get(name);
    if (existing === undefined) {
      // First symbol with this name — claim it
      ctx.claimedNames.set(name, decl.symbol);
    } else if (existing !== decl.symbol) {
      // Collision — the second (and later) symbol gets renamed
      if (!ctx.renameMap.has(decl.symbol)) {
        let i = 1;
        while (ctx.claimedNames.has(`${name}$${i}`)) i++;
        const newName = `${name}$${i}`;
        ctx.renameMap.set(decl.symbol, newName);
        ctx.claimedNames.set(newName, decl.symbol);
        logger.warn(`DTS bundle: renamed "${name}" to "${newName}" to avoid collision`);
      }
    }
  }
}

/**
 * AST-based rename: transform a node, replacing identifiers whose symbols
 * are in the rename map with their new names.
 */
function transformNodeWithRenames(
  ctx: BundleContext,
  node: import("typescript").Node,
  _sourceFile: import("typescript").SourceFile,
): import("typescript").Node {
  const { ts, checker } = ctx;
  if (ctx.renameMap.size === 0) return node;

  const transformer: import("typescript").TransformerFactory<import("typescript").Node> = (context) => {
    const visit = (n: import("typescript").Node): import("typescript").Node => {
      if (ts.isIdentifier(n)) {
        const sym = checker.getSymbolAtLocation(n);
        if (sym) {
          const resolved = resolveAlias(ts, checker, sym);
          const newName = ctx.renameMap.get(resolved);
          if (newName) {
            return ts.factory.createIdentifier(newName);
          }
        }
      }
      return ts.visitEachChild(n, visit, context);
    };
    return (n) => ts.visitNode(n, visit) as import("typescript").Node;
  };

  const result = ts.transform(node, [transformer]);
  const transformed = result.transformed[0]!;
  result.dispose();
  return transformed;
}

/**
 * Check if a symbol is inherently a type (interface, type alias) —
 * as opposed to a value (class, function, variable, enum).
 */
function isTypeOnlySymbol(
  ts: typeof import("typescript"),
  symbol: import("typescript").Symbol,
): boolean {
  const flags = symbol.flags;
  // Interface or TypeAlias without value counterpart
  if (flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
    // If also a value (e.g., merged interface + namespace), not type-only
    if (flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Function | ts.SymbolFlags.Variable | ts.SymbolFlags.Enum | ts.SymbolFlags.NamespaceModule)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Emit the final bundled .d.ts content.
 */
function emitBundle(ctx: BundleContext, declarations: CollectedDeclaration[]): string {
  const { ts } = ctx;
  const printer = ts.createPrinter({ removeComments: false });
  const parts: string[] = [];

  // 1. Triple-slash references
  const refs = [...ctx.tripleSlashRefs].sort();
  for (const ref of refs) {
    parts.push(`/// <reference types="${ref}" />`);
  }

  // 2. External imports
  const externals = [...ctx.externalImports];
  if (externals.length > 0) {
    if (parts.length > 0) parts.push("");
    for (const ext of externals) {
      parts.push(ext);
    }
  }

  // 3. Declarations
  if (declarations.length > 0) {
    if (parts.length > 0) parts.push("");
  }

  for (const decl of declarations) {
    // Apply AST-based renames for collisions
    const transformedNode = transformNodeWithRenames(ctx, decl.node, decl.sourceFile);
    let text = printer.printNode(ts.EmitHint.Unspecified, transformedNode, decl.sourceFile);

    // Manage export modifier
    const shouldBeExported = decl.symbol ? ctx.entryExportSymbols.has(decl.symbol) : decl.isExported;

    if (shouldBeExported && !decl.isExported) {
      text = "export " + text;
    } else if (!shouldBeExported && decl.isExported) {
      text = text.replace(/^export\s+(declare\s+)?/, (_, declare) => declare || "");
    }

    // Ensure declarations have 'declare' if not already present and not an export assignment
    if (!text.includes("declare ") && !ts.isExportAssignment(decl.node)) {
      if (text.startsWith("export ")) {
        text = text.replace(/^export\s+/, "export declare ");
      } else {
        text = "declare " + text;
      }
    }

    parts.push(text);
  }

  // 4. Renamed export aliases (with type-only awareness)
  const aliasLines: string[] = [];
  for (const { symbol, alias, isTypeOnly } of ctx.renamedExports) {
    const resolvedName = ctx.renameMap.get(symbol) ?? symbol.getName();
    if (resolvedName !== alias) {
      // Use `export type` if the re-export was type-only, or if the symbol is inherently type-only
      const useTypeKeyword = isTypeOnly || isTypeOnlySymbol(ts, symbol);
      const typePrefix = useTypeKeyword ? "type " : "";
      aliasLines.push(`export ${typePrefix}{ ${resolvedName} as ${alias} };`);
    }
  }
  if (aliasLines.length > 0) {
    parts.push("");
    for (const line of aliasLines) {
      parts.push(line);
    }
  }

  // 5. Ambient module declarations
  for (const amb of ctx.ambientModules) {
    parts.push("");
    parts.push(printer.printNode(ts.EmitHint.Unspecified, amb.node, amb.sourceFile));
  }

  return parts.join("\n") + "\n";
}

async function cleanInlinedFiles(outDir: string, entries: string[], allDts: string[]): Promise<void> {
  const entrySet = new Set(entries.map((e) => resolve(outDir, e)));
  const deletedSet = new Set<string>();

  for (const file of allDts) {
    if (!entrySet.has(resolve(file))) {
      try {
        await rm(file);
        deletedSet.add(resolve(file));
      } catch (err) {
        logger.verbose(`[dts-bundle] failed to clean ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Also remove orphan .d.cts/.d.mts variants whose .d.ts was deleted
  const variants = await glob("**/*.d.{cts,mts}", { cwd: resolve(outDir), absolute: true });
  for (const file of variants) {
    const baseDts = resolve(file.replace(/\.d\.[cm]ts$/, ".d.ts"));
    if (deletedSet.has(baseDts)) {
      try {
        await rm(file);
      } catch (err) {
        logger.verbose(`[dts-bundle] failed to clean variant ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
