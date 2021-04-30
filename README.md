# Test262 Automator

[![CircleCI](https://circleci.com/gh/rwaldron/test262-automator/tree/master.svg?style=svg)](https://circleci.com/gh/rwaldron/test262-automator/tree/master)


## Get Started

```
npm install;
npm run esvu;
```


## Usage 

```
node --experimental-json-modules capture.mjs --engine=xs --binPath=./binpath --test262Dir=$TEST262_DIR --name=xs
```

- `engine` is required. See [Engines](#engines).
- `test262Dir` is required. `$TEST262_DIR` points to a test262 repository root.
- `binPath` is optional. This defaults to `./binpath` (created by `npm run esvu`).
- `name` is optional. This defaults to the same value as `engine`.

### Engines

```
chakra
engine262
graaljs
hermes
javascriptcore
qjs
spidermonkey
v8
xs
```
