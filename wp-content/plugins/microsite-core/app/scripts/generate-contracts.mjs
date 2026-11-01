import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const contractsDirectory = new URL("../../contracts/", import.meta.url);
const outputPath = new URL("../src/generated/drafts.ts", import.meta.url);

function typescriptType(schema, indentation = 0) {
  if (schema.enum) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (schema.type === "integer" || schema.type === "number") {
    return "number";
  }

  if (schema.type === "boolean") {
    return "boolean";
  }

  if (schema.type === "string") {
    return "string";
  }

  if (schema.type === "object") {
    const properties = Object.entries(schema.properties).map(
      ([key, property]) => {
        const optional = schema.required?.includes(key) ? "" : "?";
        const propertyType = typescriptType(property, indentation + 2);
        return `${" ".repeat(indentation + 2)}${JSON.stringify(key)}${optional}: ${propertyType};`;
      },
    );
    return `{\n${properties.join("\n")}\n${" ".repeat(indentation)}}`;
  }

  throw new Error(
    `Unsupported contract type: ${schema.type}. Extend the generator explicitly.`,
  );
}

const files = readdirSync(contractsDirectory)
  .filter((name) => name.endsWith(".json"))
  .sort();
const declarations = [];
const mapping = [];

for (const file of files) {
  const schema = JSON.parse(
    readFileSync(new URL(file, contractsDirectory), "utf8"),
  );
  const match = /^(.*)\.v(\d+)\.json$/.exec(file);

  if (!match || !/^[A-Za-z][A-Za-z0-9]*$/.test(schema.title)) {
    throw new Error(`Invalid contract name: ${file}`);
  }

  declarations.push(`export type ${schema.title} = ${typescriptType(schema)};`);
  mapping.push(`  ${JSON.stringify(match[1])}: ${schema.title};`);
}

const generated = [
  "// Generated from contracts/*.json. Do not edit by hand.",
  ...declarations,
  `export interface DraftBySiteType {\n${mapping.join("\n")}\n}`,
  "",
].join("\n\n");

if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");

  if (current !== generated) {
    throw new Error(
      "Generated contracts are outdated. Run npm run contracts:generate.",
    );
  }

  console.log("Contract types are up to date.");
} else {
  writeFileSync(outputPath, generated);
  console.log(`Generated ${fileURLToPath(outputPath)}.`);
}
