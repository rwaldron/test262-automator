#!/usr/bin/env node
import path from "path";
import fs from "fs";
import readline from "readline";
import getDate from "./lib/date.mjs";

const captureDir = path.resolve("./capture");

if (!fs.statSync(captureDir).isDirectory()) {
  console.error(
    "capture folder not found. Please, run the capture script before this."
  );
  process.exit(1);
}

const historicDir = path.resolve(captureDir, getDate());

if (!fs.existsSync(historicDir)) {
  fs.mkdirSync(historicDir);
}

fs.readdirSync(captureDir).forEach(file => {
  if (!file.startsWith("meta-")) {
    return;
  }

  const metafile = path.resolve(path.join("capture", file));
  const meta = JSON.parse(fs.readFileSync(metafile));
  console.log("Parsing data for:");
  console.log(meta);

  const { name, folder } = meta;
  const folderLabel = folder ? `-${folder}` : "";
  const suffix = `-${name}${folderLabel}.json`;
  const outputFile = path.resolve(path.join("capture", `output${suffix}`));
  const reader = readline.createInterface({
    input: fs.createReadStream(outputFile)
  });

  const folders = [];
  const info = {
    singleFiles: new Set(),
    lines: 0,
    passing: 0,
    failing: 0,
    meta
  };

  // Problem: this assumes output is always generated with each results
  // object set line by line. If anything changes, load the whole json file
  // to the memory; parse it; and read each object from the collection.
  // This streaming reader should cost less to the memory usage as the output
  // files can reach around ~25MB.
  reader.on("line", line => {
    // Skip the array wrappers
    if (/^[\[\]]/.test(line)) {
      return;
    }

    info.lines += 1;

    // Remove the leading comma
    if (line.startsWith(",")) {
      line = line.substring(1);
    }

    const test = JSON.parse(line);

    const { relative, result, rawResult, scenario, attrs } = test;

    if (!relative || !result) {
      console.error("Wrong tests results found, aborting...");
      process.exit(1);
    }

    info.singleFiles.add(relative);
    if (result.pass) {
      info.passing += 1;
    } else {
      info.failing += 1;
    }

    // Improve this if we ever start using Windows for capturing results
    relative.split("/").reduce((parent, name) => {
      const isFile = name.endsWith(".js") && relative.endsWith(name);

      let entry = parent.find(obj => obj.name === name);

      if (!entry) {
        if (isFile) {
          entry = {
            name,
            results: []
          };
        } else {
          entry = {
            name,
            children: [],
            summary: {
              total: 0,
              passing: 0,
              failing: 0
            }
          };
        }
        parent.push(entry);
      }

      if (isFile) {
        const { features, negative, description } = attrs;
        if (features && !entry.features) {
          entry.features = features;
        }

        if (negative && !entry.negative) {
          entry.negative = negative;
        }

        entry.description = description;

        entry.results.push({
          scenario,
          ...result, // pass
          rawResult
        });
      } else {
        const summary = entry.summary;

        summary.total += 1;
        summary.passing += Number(result.pass);
        summary.failing += Number(!result.pass);

        return entry.children;
      }
    }, folders);
  });

  reader.on("close", () => {
    if (!info.lines) {
      console.error("No tests results found, aborting...");
      process.exit(1);
    }

    function sort(folder) {
      folder.forEach(({ children }) => {
        if (Array.isArray(children)) {
          children = sort(children);
        }
      });
      return folder.sort(({ name: name1 }, { name: name2 }) => {
        name1 = name1.toUpperCase();
        name2 = name2.toUpperCase();
        if (name1 < name2) {
          return -1;
        }
        if (name1 > name2) {
          return 1;
        }

        return 0;
      });
    }

    const sorted = sort(folders);
    const data = JSON.stringify({
      children: sorted,
      host: {
        ...meta
      }
    });

    const target = path.resolve("capture", `parsed${suffix}`);
    const historic = path.resolve(historicDir, `parsed${suffix}`);

    fs.writeFileSync(target, data);
    fs.copyFileSync(target, historic);

    console.log(`History saved in ${historic}`);
    console.log(`Done saving parsed data into ${target}`);
    console.log("----------------------------------------------");
    console.log(`Engine: ${meta.engine} version ${meta.version}`);
    console.log(`Name used: ${meta.name}`);
    console.log(`Args used: ${meta.args}`);
    console.log(`Test262 Revision: ${meta.revision}`);
    console.log(`Tests run: ${info.lines}`);
    console.log(`Unique files: ${info.singleFiles.size}`);
    console.log(`Passing tests: ${info.passing}`);
    console.log(`Failing tests: ${info.failing}`);
    console.log("Folders:");

    function folderStats(
      { name, summary: { total, passing, failing }, children },
      prefix = ""
    ) {
      console.log(
        `- test/${prefix}${name}/: ${total} tests run, ${passing} passing, ${failing} failing.`
      );
    }
    sorted.forEach(folder => {
      folderStats(folder);
      folder.children.forEach(subfolder => {
        if (!subfolder.summary) {
          // not a folder
          return;
        }
        folderStats(subfolder, `${folder.name}/`);
      });
    });
  });
});
