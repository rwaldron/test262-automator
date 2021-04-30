import cp from "child_process";

export default function(strings, ...values) {
  let args = String.raw(strings, ...values).split(" ");

  const first = args.shift().trim();
  return cp.spawn(first, args, { shell: true });
};
