// @changesets/cli's bin.js calls node:module's enableCompileCache, which Deno
// deliberately does not implement (denoland/deno#34348). Importing the package
// entry runs the same CLI without that call, with argv passed through unchanged.
import '@changesets/cli';
