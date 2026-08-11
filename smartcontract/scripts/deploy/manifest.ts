import * as fs from "fs";
import * as path from "path";

export const deploymentsDir = path.resolve(__dirname, "../../../deployments");
const localMode = process.env.ALLOW_LOCAL_DEPLOY === "true";
export const draftPath = path.join(deploymentsDir, localMode ? "hardhat-v2-draft.json" : "coston2-v2-draft.json");
export const finalPath = path.join(deploymentsDir, "coston2.json");

export type DraftManifest = Record<string, any>;

function emptyDraft(): DraftManifest {
  return {
    network: localMode ? "hardhat-local" : "coston2",
    chainId: localMode ? 31337 : 114,
    version: "v2-draft",
  };
}

export function readDraft(): DraftManifest {
  if (!fs.existsSync(draftPath)) return emptyDraft();
  const parsed = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`Invalid deployment draft: ${draftPath}`);
  return parsed;
}

export function resetDraft(initial: DraftManifest = {}): DraftManifest {
  const next = deepMerge(emptyDraft(), initial);
  writeJsonAtomic(draftPath, next);
  return next;
}

export function writeDraft(update: DraftManifest): DraftManifest {
  const next = deepMerge(readDraft(), update);
  writeJsonAtomic(draftPath, next);
  return next;
}

export function writeFinal(manifest: DraftManifest): void {
  writeJsonAtomic(finalPath, manifest);
}

function writeJsonAtomic(filePath: string, value: DraftManifest): void {
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const temp = `${filePath}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temp, filePath);
}

function deepMerge(target: DraftManifest, source: DraftManifest): DraftManifest {
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] && typeof output[key] === "object" ? output[key] : {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}
