import fs from "fs";
import path from "path";

const locationsPath = path.join(process.cwd(), "src/tamilnadu_locations.json");

export const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf-8")
);
