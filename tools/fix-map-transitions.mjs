import fs from "fs";

for (let i = 1; i <= 10; i += 1) {
  const path = `src/maps/mapa${i}.ts`;
  const text = fs.readFileSync(path, "utf8");
  const next = text.replace(/transitions: \{\}/g, "transitions: []");
  if (next !== text) {
    fs.writeFileSync(path, next);
    console.log("fixed", path);
  } else {
    console.log("no change", path);
  }
}
