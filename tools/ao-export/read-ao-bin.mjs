import fs from "fs";

const PASS_SIZE = 200;
const path =
  process.argv[2] ||
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Argentum 20\\Argentum20\\Recursos\\OUTPUT\\AO.bin";

const data = fs.readFileSync(path);
if (data.length < PASS_SIZE) {
  console.error("AO.bin too small:", data.length);
  process.exit(1);
}

const lenHigh = data[PASS_SIZE - 2];
const lenLow = data[PASS_SIZE - 1];
const pwdLen = lenHigh * 256 + lenLow;

console.log("Password length from AO.bin:", pwdLen);

let password = "";
for (let i = 1; i <= pwdLen; i++) {
  const idx = i * 3 - 2 - 1;
  password += String.fromCharCode(data[idx] ^ 37);
}

console.log("Password (extract_ao reads this):", password);

// Also try alternate index used when saving (idx2 = i*3-2)
let alt = "";
for (let i = 1; i <= pwdLen; i++) {
  const idx = i * 3 - 2;
  alt += String.fromCharCode(data[idx] ^ 37);
}
console.log("Password (alternate index):", alt);
