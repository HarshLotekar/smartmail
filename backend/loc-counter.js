import fs from "fs";
import path from "path";

const excludeFolders = ["node_modules", "build", "dist", ".git", "public"];

function countLines(dir) {
  let total = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (!excludeFolders.includes(file)) {
        total += countLines(fullPath);
      }
    } else if (/\.(js|jsx|ts|tsx|css|html)$/.test(file)) {
      const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
      total += lines;
    }
  }
  return total;
}

function main() {
  const folders = ["frontend", "backend", "src", "."]; // adjust based on your structure
  let grandTotal = 0;

  console.log("📊 Lines of Code Summary:\n");

  for (const folder of folders) {
    if (fs.existsSync(folder)) {
      const count = countLines(folder);
      grandTotal += count;
      console.log(`${folder.padEnd(15)}: ${count} lines`);
    }
  }

  console.log("\n------------------------------------");
  console.log(`🧮 Total LOC (React + Node): ${grandTotal} lines`);
}

main();
