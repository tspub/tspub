export interface ChunkInfo {
  path: string;
  format: "esm" | "cjs" | "iife";
}

export interface OutputFile {
  path: string;
  size: number;
}

export interface TspubBuildPlugin {
  name: string;
  buildStart?(): Promise<void> | void;
  renderChunk?(code: string, info: ChunkInfo): Promise<{ code: string } | void> | void;
  buildEnd?(ctx: { files: OutputFile[] }): Promise<void> | void;
}

export interface PluginContainer {
  buildStart(): Promise<void>;
  processChunk(code: string, info: ChunkInfo): Promise<string>;
  buildEnd(files: OutputFile[]): Promise<void>;
}

export function createPluginContainer(plugins: TspubBuildPlugin[]): PluginContainer {
  return {
    async buildStart() {
      for (const p of plugins) {
        if (p.buildStart) {
          try {
            await p.buildStart();
          } catch (err) {
            throw new Error(`Plugin "${p.name}" buildStart failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
          }
        }
      }
    },

    async processChunk(code: string, info: ChunkInfo): Promise<string> {
      let result = code;
      for (const p of plugins) {
        if (p.renderChunk) {
          try {
            const out = await p.renderChunk(result, info);
            if (out?.code) result = out.code;
          } catch (err) {
            throw new Error(`Plugin "${p.name}" renderChunk failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
          }
        }
      }
      return result;
    },

    async buildEnd(files: OutputFile[]) {
      for (const p of plugins) {
        if (p.buildEnd) {
          try {
            await p.buildEnd({ files });
          } catch (err) {
            throw new Error(`Plugin "${p.name}" buildEnd failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
          }
        }
      }
    },
  };
}
