// Copyright 2022-2023 Lekko Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as core from "@actions/core";
import * as io from "@actions/io";
import cp from "child_process";
import * as os from "os";
import * as path from "path";
import { Error, isError } from "./error";
import { getLekko } from "./lekko";

export async function run(): Promise<void> {
  try {
    const result = await runSetup();
    if (result !== null && isError(result)) {
      core.setFailed(result.message);
    }
  } catch (error) {
    // In case we ever fail to catch an error
    // in the call chain, we catch the error
    // and mark the build as a failure. The
    // user is otherwise prone to false positives.
    if (isError(error)) {
      core.setFailed(error.message);
      return;
    }
    core.setFailed("Internal error");
  }
}

// runSetup runs the lekko-setup action, and returns
// a non-empty error if it fails.
async function runSetup(): Promise<null | Error> {
  const version = core.getInput("version");
  if (version === "") {
    return {
      message: "a version was not provided",
    };
  }
  const githubToken = core.getInput("github_token");
  if (githubToken === "") {
    return {
      message: "No github_token supplied, won't be able to download lekko",
    };
  }

  core.info(`Setting up Lekko version "${version}"`);
  const installDir = await getLekko(version, githubToken);
  if (isError(installDir)) {
    return installDir;
  }

  core.info(
    `Adding lekko binary to PATH. This is the install directory: ${installDir}`
  );
  let binaryPath = "";
  if (os.platform() === "win32") {
    core.addPath(installDir);
  } else {
    core.addPath(path.join(installDir, "bin"));
  }
  binaryPath = await io.which("lekko", true);
  if (binaryPath === "") {
    return {
      message: "lekko was not found on PATH",
    };
  }

  core.info(`Successfully setup lekko version ${version}`);
  core.info(cp.execSync(`${binaryPath} --version`).toString());
  return null;
}
