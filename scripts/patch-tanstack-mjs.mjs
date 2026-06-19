import { readFileSync, writeFileSync } from "fs";

const raw = new URL("../node_modules/@tanstack/start-plugin-core/dist/esm/vite/start-compiler-plugin/plugin.js", import.meta.url).pathname;
const path = decodeURIComponent(raw);
let content = readFileSync(path, "utf8");

// Target the validate-server-fn-id plugin's load handler
// Replace this.environment.transformRequest with ssrEnv.transformRequest
// to ensure the TanStack compiler (which only exists in the SSR env) processes the file.
const oldBlock = `const absPath = resolve(root, sourceFile);
								if (this.environment.mode !== "dev") this.error(\`could not validate server function ID \${fnId}: unknown environment mode \${this.environment.mode}\`);
								await this.environment.transformRequest(\`\${absPath}?\${SERVER_FN_LOOKUP}\`);
								if (serverFnsById[fnId]) return \`export {}\`;`;

const newBlock = `const absPath = resolve(root, sourceFile);
								if (this.environment.mode !== "dev") this.error(\`could not validate server function ID \${fnId}: unknown environment mode \${this.environment.mode}\`);
								const ssrEnv = environmentByName.get(ssrEnvName);
								if (ssrEnv) {
									await ssrEnv.transformRequest(absPath);
									if (serverFnsById[fnId]) return \`export {}\`;
									await ssrEnv.transformRequest(\`\${absPath}?\${SERVER_FN_LOOKUP}\`);
									if (serverFnsById[fnId]) return \`export {}\`;
								}`;

// Also handle the already-patched version (with this.environment.transformRequest(absPath) added)
const oldPatchedBlock = `const absPath = resolve(root, sourceFile);
								if (this.environment.mode !== "dev") this.error(\`could not validate server function ID \${fnId}: unknown environment mode \${this.environment.mode}\`);
								await this.environment.transformRequest(absPath);
								if (serverFnsById[fnId]) return \`export {}\`;
								await this.environment.transformRequest(\`\${absPath}?\${SERVER_FN_LOOKUP}\`);
								if (serverFnsById[fnId]) return \`export {}\`;`;

const ssrPatchedBlock = `const absPath = resolve(root, sourceFile);
								if (this.environment.mode !== "dev") this.error(\`could not validate server function ID \${fnId}: unknown environment mode \${this.environment.mode}\`);
								const ssrEnv = environmentByName.get(ssrEnvName);
								if (ssrEnv) {
									await ssrEnv.transformRequest(absPath);
									if (serverFnsById[fnId]) return \`export {}\`;
									await ssrEnv.transformRequest(\`\${absPath}?\${SERVER_FN_LOOKUP}\`);
									if (serverFnsById[fnId]) return \`export {}\`;
								}`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    writeFileSync(path, content);
    console.log("Patched TanStack validate-server-fn-id handler: targets SSR env instead of module runner env.");
} else if (content.includes(oldPatchedBlock)) {
    content = content.replace(oldPatchedBlock, ssrPatchedBlock);
    writeFileSync(path, content);
    console.log("Patched TanStack validate-server-fn-id handler (upgraded from previous patch): targets SSR env.");
} else if (content.includes(ssrPatchedBlock)) {
    console.log("Patch already applied.");
} else {
    console.log("Could not find the target code to patch.");
    console.log("Looked for these patterns:");
    console.log("1. Original: this.environment.transformRequest with lookup");
    console.log("2. Previous patch: this.environment.transformRequest(absPath) + lookup");
}
