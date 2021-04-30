# Test262 Automator



## Get Started

```
npm install;
npm run esvu;
```


## Usage 

```
node --experimental-json-modules capture.mjs --engine=xs --binPath=./binpath --test262Dir=$TEST262_DIR --name=xs
```

- `engine` is required. See [Valid engines](#valid-engines).
- `test262Dir` is required. `$TEST262_DIR` points to a test262 repository root.
- `binPath` is optional. This defaults to `./binpath` (created by `npm run esvu`).
- `name` is optional. This defaults to the same value as `engine`.

### Valid engines: 

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

