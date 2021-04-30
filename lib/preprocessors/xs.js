const path = require("path");

const nonSupported = [];

const nonSupportedPaths = [
  "intl402/",
  "annexB/language/",
  "annexB/built-ins/Function/",
  "annexB/built-ins/RegExp/",
  "annexB/built-ins/Date/prototype/toGMTString/",
  "annexB/built-ins/Object/prototype/__defineGetter__",
  "annexB/built-ins/Object/prototype/__defineSetter__",
  "annexB/built-ins/Object/prototype/__lookupGetter__",
  "annexB/built-ins/Object/prototype/__lookupSetter__",
  "annexB/built-ins/String/prototype/anchor",
  "annexB/built-ins/String/prototype/big",
  "annexB/built-ins/String/prototype/blink",
  "annexB/built-ins/String/prototype/bold",
  "annexB/built-ins/String/prototype/fixed",
  "annexB/built-ins/String/prototype/fontcolor",
  "annexB/built-ins/String/prototype/fontsize",
  "annexB/built-ins/String/prototype/italics",
  "annexB/built-ins/String/prototype/link",
  "annexB/built-ins/String/prototype/small",
  "annexB/built-ins/String/prototype/strike",
  "annexB/built-ins/String/prototype/sub",
  "annexB/built-ins/String/prototype/sup",
  "annexB/built-ins/String/prototype/trimLeft",
  "annexB/built-ins/String/prototype/trimRight",
  "/cross-realm.js",
  "/create-proto-from-ctor-realm-array.js"
].map(p => p.replace(/\//g, path.sep));

class FeaturesNotSupported extends Error {
  get name() {
    return "FeaturesNotSupported";
  }
}

class PathNotSupported extends Error {
  get name() {
    return "PathNotSupported";
  }
}

module.exports = function(test) {
  const {
    relative,
    attrs: { features = [] }
  } = test;
  let error = null;

  const matchingFeatures = features
    .filter(feature => nonSupported.includes(feature))
    .join(", ");
  if (matchingFeatures.length) {
    error = new FeaturesNotSupported(matchingFeatures);
  }

  if (nonSupportedPaths.some(p => relative.includes(p))) {
    error = new PathNotSupported(relative);
  }

  if (error) {
    test.result = {
      stderr: `${error}\n`,
      stdout: "",
      error
    };
  }
  return test;
};
