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
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/core";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as os from "os";
import * as path from "path";
import { Error, isError } from "./error";

// versionPrefix is used in Github release names, and can
// optionally be specified in the action's version parameter.
const versionPrefix = "v";

export async function getLekko(
  version: string,
  githubToken: string
): Promise<string | Error> {
  const binaryPath = tc.find("lekko", version, os.arch());
  if (binaryPath !== "") {
    core.info(`Found in cache @ ${binaryPath}`);
    return binaryPath;
  }

  core.info(`Resolving the download URL for the current platform...`);
  const downloadURL = await getDownloadURL(version, githubToken);
  if (isError(downloadURL)) {
    return downloadURL;
  }

  let cacheDir = "";
  core.info(
    `Downloading lekko version "${version}" from ${downloadURL} using token of length ${
      githubToken.length
    }: ${githubToken.slice(0, 5)}`
  );
  const downloadPath = await tc.downloadTool(
    downloadURL,
    undefined,
    githubToken
  );
  core.info(
    `Successfully downloaded lekko version "${version}" from ${downloadURL}`
  );

  core.info("Extracting lekko...");
  // TODO: we don't release windows platform builds currently. When we do,
  // update this code path to extract .exe appropriately
  const extractPath = await tc.extractTar(downloadPath);
  core.info(`Successfully extracted lekko to ${extractPath}`);

  core.info("Adding lekko to the cache...");
  cacheDir = await tc.cacheDir(
    path.join(extractPath, "lekko"),
    "lekko",
    version,
    os.arch()
  );
  core.info(`Successfully cached lekko to ${cacheDir}`);
  return cacheDir;
}

// getDownloadURL resolves Lekko's Github download URL for the
// current architecture and platform.
async function getDownloadURL(
  version: string,
  githubToken: string
): Promise<string | Error> {
  let architecture = "";
  switch (os.arch()) {
    // The available architectures can be found at:
    // https://nodejs.org/api/process.html#process_process_arch
    case "x64":
      architecture = "x86_64";
      break;
    case "arm64":
      architecture = "arm64";
      break;
    default:
      return {
        message: `The "${os.arch()}" architecture is not supported with a Lekko release.`,
      };
  }
  let platform = "";
  switch (os.platform()) {
    // The available platforms can be found at:
    // https://nodejs.org/api/process.html#process_process_platform
    case "linux":
      platform = "Linux";
      break;
    case "darwin":
      platform = "Darwin";
      break;
    default:
      return {
        message: `The "${os.platform()}" platform is not supported with a Lekko release.`,
      };
  }
  const assetName = `lekko_${platform}_${architecture}.tar.gz`;
  const requestAgent = process.env.http_proxy
    ? new HttpsProxyAgent(process.env.http_proxy)
    : undefined;
  const octokit = new Octokit({
    auth: githubToken,
    request: {
      agent: requestAgent,
    },
  });
  if (version === "latest") {
    const { data: releases } = await octokit.request(
      "GET /repos/{owner}/{repo}/releases",
      {
        owner: "lekkodev",
        repo: "cli",
        per_page: 1,
      }
    );
    for (const asset of releases[0].assets) {
      if (assetName === asset.name) {
        return asset.url;
      }
    }
    return {
      message: `Unable to find Lekko version "${version}" for platform "${platform}" and architecture "${architecture}".`,
    };
  }
  const tag = releaseTagForVersion(version);
  const { data: release } = await octokit.request(
    "GET /repos/{owner}/{repo}/releases/tags/{tag}",
    {
      owner: "lekkodev",
      repo: "cli",
      tag: tag,
    }
  );
  for (const asset of release.assets) {
    if (assetName === asset.name) {
      return asset.url;
    }
  }
  return {
    message: `Unable to find Lekko version "${version}" for platform "${platform}" and architecture "${architecture}".`,
  };
}

// releaseTagForVersion returns the release tag name based on a given version configuration.
// Github releases include the 'v' prefix, but the user-supplied version may not. Thus, we permit
// both versions, e.g. v0.38.0 and 0.38.0.
function releaseTagForVersion(version: string): string {
  if (version.indexOf(versionPrefix) === 0) {
    return version;
  }
  return versionPrefix + version;
}
