#!/usr/bin/env node
import path from "path";
import fs from "fs";
import {execSync} from "child_process";
import fetch from "node-fetch";
import yargs from "yargs";
import request from "request";
import run from "./lib/run.mjs";
import getDate from "./lib/date.mjs";
import enginesJson from "./engines.json";
import enginesStatus from "./status.json";

const engines = new Map(enginesJson);

const enginesList = [...engines.keys()].join(", ");

const argv = yargs
  .usage(
    `Usage: $0 -t <test262Dir> -e <engine>

Available engines: ${enginesList}`
  )
  .alias("e", "engine")
  .alias("t", "test262Dir")
  .alias("a", "args")
  .alias("n", "name")
  .alias("p", "binPath")
  .demandOption(["test262Dir"])
  .default("engine", () => process.env.ENGINE_NAME)
  .default("args", () => process.env.HOSTARGS)
  .default("name", () => process.env.ENGINE_LABEL)
  .default("binPath", () => process.env.BIN_PATH).argv;

let { engine, test262Dir, args, name, binPath } = argv;
test262Dir = path.resolve(test262Dir);

if (!name) {
  name = engine;
}

if (!binPath) {
  binPath = "binpath";
}

console.log(`*SVU Status: ${JSON.stringify(enginesStatus, null, 2)}`);

console.log(`argv engine: ${engine}`);
console.log(`argv name: ${name}`);
console.log(`argv binPath: ${binPath}`);

if (!engines.has(engine)) {
  const msg =
    `A valid engine is required, "${engine}" is not valid.\n` +
    `Supported engines: ${enginesList}`;
  console.error(msg);
  process.exit(1);
}

if (!name) {
  if (args) {
    name = `${engine}-${String(args).replace(" ", "_")}`;
  } else {
    name = engine;
  }
}

const captureDir = path.resolve("./capture");
if (!fs.existsSync(captureDir)) {
  fs.mkdirSync(captureDir);
}

const historicDir = path.resolve(captureDir, getDate());
if (!fs.existsSync(historicDir)) {
  fs.mkdirSync(historicDir);
}

const { binName, hostType, preprocessor } = engines.get(engine);
const hostPath = path.join(binPath, binName || engine);

let version = enginesStatus[engine] || enginesStatus.installed[({
  chakra: "ch",
  javascriptcore: "jsc",
  spidermonkey: "jsshell",
})[engine] || engine].version;

console.log(`Engine name: ${name}`);
console.log(`Engine version: ${version}`);
console.log(`Engine hostPath: ${hostPath}`);
console.log(`Engine hostType: ${hostType}`);
console.log(`Engine preprocessor: ${preprocessor}`);
console.log(`test262Dir: ${test262Dir}`);

const revision = execSync(`git -C ${test262Dir} rev-parse HEAD`)
  .toString()
  .trim();
console.log(`Test262 Revision: ${revision}`);

const metalink = `https://s3.amazonaws.com/test262-automator/captures/meta-${name}.json`;
console.log(`fetching meta from: ${metalink}`);

function getContents(previous) {
  const now = Date.now();
  if (previous) {
    // This preserves retrocompatibility
    if (!previous.allRuns) {
      previous.allRuns = [previous.timeStamp];
    }

    // This is important to remain positioned after the if block above
    // so previous.allRuns stores the old timeStamp
    previous.timeStamp = now;

    previous.allRuns.push(now);

    return previous;
  } else {
    return {
      engine,
      version,
      revision,
      args,
      name,
      allRuns: [now],
      timeStamp: now
    };
  }
}

function saveMeta(previous) {
  const contents = getContents(previous);

  const metafile = path.resolve(captureDir, `meta-${name}.json`);
  const historic = path.resolve(historicDir, `meta-${name}.json`);

  console.log(`Saving the historic metadata to ${historic}`);
  console.log(`Saving the metadata to ${metafile}`);

  fs.writeFileSync(metafile, JSON.stringify(contents));
  fs.copyFileSync(metafile, historic);
}

function captureResults() {
  saveMeta();
  run({ hostType, hostPath, preprocessor, test262Dir, captureDir, name, args });
}

async function copyResults(meta) {
  saveMeta(meta);

  const filename = `output-${name}.json`;

  const outputLink = `https://s3.amazonaws.com/test262-automator/captures/${filename}`;
  const outputFile = fs.createWriteStream(path.resolve(captureDir, filename));
  const historicFile = fs.createWriteStream(
    path.resolve(historicDir, filename)
  );

  const res = (await fetch(outputLink)).body;

  res.pipe(outputFile);
  res.pipe(historicFile);
}

request(metalink, (err, { statusCode }, body) => {
  if (err) {
    console.error(`Error when fetching the meta file: ${err}`);
    return process.exit(1);
  }

  if (statusCode === 200) {
    const previous = JSON.parse(body);

    if (previous.version === version && previous.revision === revision) {
      console.log(
        "The tests are up to date, found the tests for the same engine version and revision"
      );
      // No need to run the tests again, just reuse the previous output
      return copyResults(previous).then(
        () => {
          console.log("Done copying output files");
        },
        err => {
          throw err;
        }
      );
    }

    console.log(
      `Found results meta for ${name} @ ${previous.version} on Test262 revision ${previous.revision}`
    );
  } else {
    console.log(`Failed finding a meta file for ${name}, running the tests.`);
    console.log(`status code: ${statusCode}`);
  }

  return captureResults();
});
