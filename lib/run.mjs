import fs from "fs";
import progress from "progress-stream";
import path from "path";
import qx from "./qx.mjs";

export default function run({
  hostType,
  hostPath,
  preprocessor,
  test262Dir,
  captureDir,
  name,
  args = ""
}) {
  const preprocessorpath = path.join("preprocessors", `${hostType}.js`);
  if (!preprocessor && fs.existsSync(preprocessorpath)) {
    preprocessor = preprocessorpath;
  }
  const relativePath = path.relative(process.cwd(), test262Dir);
  const cmd =
    "./node_modules/.bin/test262-harness --t=8 --reporter=json" +
    ` --hostType=${hostType}` +
    ` --hostPath=${hostPath}` +
    ` --test262Dir=${relativePath}` +
    ` --hostArgs='${args}'` +
    (preprocessor ? ` --preprocessor=${preprocessor}` : "") +
    " --reporter-keys=relative,scenario,result,rawResult,attrs.features" +
    ` -- '${path.join(relativePath, "test", "**", "*")}'`;

  console.log("Running the tests...");
  console.log(cmd);

  const capturePath = `${captureDir}/output-${name}.json`;
  const captureFile = fs.createWriteStream(capturePath);

  const reader = qx`${cmd}`;
  const CI = process.env.CI;
  const prog = progress({
    time: CI ? 60000 : 1000
  });

  const sprites = "-\\|/-\\|/".split("");

  prog.on("progress", ({ runtime, delta, speed, transferred }) => {
    const extras = `speed: ${speed.toFixed(
      2
    )}, transferred: ${transferred}, delta: ${delta}`;
    if (CI) {
      if (runtime < 120) {
        console.log(`${Math.floor(runtime / 60)} minute, ${extras}`);
      } else {
        console.log(`${Math.floor(runtime / 60)} minutes, ${extras}`);
      }
    } else {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `[${sprites[runtime % 8]}] ${runtime} seconds, ${extras}`
      );
    }
  });

  reader.stdout.pipe(prog).pipe(captureFile);
  reader.stderr.pipe(process.stderr);
  reader.stdout.on("end", () => {
    console.log("Finished running the tests, saving the output...");
    captureFile.end();
    console.log(`\nResults saved in ${capturePath}\n`);
  });
};
