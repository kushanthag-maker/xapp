import fs from "fs";

const file = process.argv[2];

if (!file) {
    console.log("==================================");
    console.log("      LOG ANALYZER v1.0");
    console.log("==================================");
    console.log("Usage:");
    console.log("node analyzer.js test.log");
    process.exit(0);
}

if (!fs.existsSync(file)) {
    console.log("❌ Log file not found!");
    process.exit(1);
}

const log = fs.readFileSync(file, "utf8");
const lines = log.split("\n");

let errors = [];
let warnings = [];
let fatals = [];
let exceptions = [];
let infos = [];

for (const line of lines) {
    if (/error/i.test(line)) errors.push(line);
    if (/warning/i.test(line)) warnings.push(line);
    if (/fatal/i.test(line)) fatals.push(line);
    if (/exception/i.test(line)) exceptions.push(line);
    if (/info/i.test(line)) infos.push(line);
}

console.log("\n========== STAGE 1 ==========");
console.log(`INFO       : ${infos.length}`);
console.log(`WARNINGS   : ${warnings.length}`);
console.log(`ERRORS     : ${errors.length}`);
console.log(`FATALS     : ${fatals.length}`);
console.log(`EXCEPTIONS : ${exceptions.length}`);

console.log("\n========== STAGE 2 ==========");

if (fatals.length > 0) {
    console.log("🔴 Critical failure detected.");
} else if (errors.length > 0) {
    console.log("🟠 Runtime errors detected.");
} else if (warnings.length > 0) {
    console.log("🟡 Warnings found.");
} else {
    console.log("🟢 No major issues detected.");
}

console.log("\n========== FINAL ANALYSIS ==========");

let risk = "LOW";

if (fatals.length > 0 || exceptions.length > 0)
    risk = "HIGH";
else if (errors.length > 0)
    risk = "MEDIUM";

console.log(`Risk Level : ${risk}`);

console.log("\nTop Errors:");

if (errors.length === 0) {
    console.log("No errors found.");
} else {
    errors.slice(0, 10).forEach((e, i) => {
        console.log(`${i + 1}. ${e}`);
    });
}

console.log("\nAnalysis Complete.");
