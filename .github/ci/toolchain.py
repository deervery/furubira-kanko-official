#!/usr/bin/env python3
"""Install official, SHA256-verified Linux toolchains without a JavaScript Action.

Tools stay in the runner's tool cache; no system install or sudo. Application Node
tests still run on the explicitly selected runtime. Remote Actions caches are not
used; existing local Go/module/npm caches remain available.
"""
import argparse
import hashlib
import json
import os
import pathlib
import platform
import re
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request


def read_url(url):
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def select_version(versions, selector):
    if not re.fullmatch(r"[0-9]+(?:\.[0-9]+){0,2}", selector):
        raise ValueError("Expected a numeric major, minor or patch version")
    matches = [v for v in versions if v == selector or v.startswith(selector + ".")]
    if not matches:
        raise ValueError("Official release not found: " + selector)
    return max(matches, key=lambda v: tuple(map(int, v.split("."))))


def unpack(archive, destination):
    with tarfile.open(archive) as tar:
        # data filtering rejects absolute paths, traversal and links outside dest.
        # Supported by the Python 3.12 runners used by these workflows.
        tar.extractall(destination, filter="data")


def install(tool, selector):
    if platform.system() != "Linux":
        raise ValueError("Only the existing Linux CI runners are supported")
    arch = {"x86_64": "amd64", "aarch64": "arm64"}[platform.machine()]
    if tool == "go":
        releases = json.loads(read_url("https://go.dev/dl/?mode=json&include=all"))
        releases = {r["version"][2:]: r for r in releases if r.get("stable")}
        version = select_version(releases, selector)
        item = next(f for f in releases[version]["files"]
                    if f["os"] == "linux" and f["arch"] == arch and f["kind"] == "archive")
        filename, digest = item["filename"], item["sha256"]
        url = "https://go.dev/dl/" + filename
        top = "go"
    else:
        releases = json.loads(read_url("https://nodejs.org/dist/index.json"))
        versions = [r["version"][1:] for r in releases
                    if re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+", r["version"])]
        version = select_version(versions, selector)
        node_arch = {"amd64": "x64", "arm64": "arm64"}[arch]
        top = "node-v" + version + "-linux-" + node_arch
        filename = top + ".tar.xz"
        base = "https://nodejs.org/dist/v" + version + "/"
        sums = read_url(base + "SHASUMS256.txt").decode().splitlines()
        digest = next(line.split()[0] for line in sums if line.split()[-1] == filename)
        url = base + filename
    if not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("Invalid official checksum")
    cache = pathlib.Path(os.environ["RUNNER_TOOL_CACHE"]) / "native-ci" / tool / version / arch
    # A digest-specific directory prevents accidentally reusing a different archive.
    target = cache / digest
    binary = target / "bin" / tool
    cache.mkdir(parents=True, exist_ok=True)
    if not binary.is_file():
        with tempfile.TemporaryDirectory(prefix="install-", dir=cache) as work:
            work = pathlib.Path(work)
            archive = work / filename
            hasher = hashlib.sha256()
            with urllib.request.urlopen(url, timeout=120) as response, archive.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    hasher.update(chunk)
                    output.write(chunk)
            if hasher.hexdigest() != digest:
                raise ValueError("Toolchain checksum mismatch")
            unpack(archive, work / "unpacked")
            try:
                (work / "unpacked" / top).rename(target)
            except FileExistsError:
                # Another job can finish installing the same verified archive.
                if not binary.is_file():
                    raise
    check_env = dict(os.environ, GOTOOLCHAIN="local")
    result = subprocess.check_output(
        [str(binary), "version" if tool == "go" else "--version"],
        env=check_env, text=True).strip()
    expected = "go" + version if tool == "go" else "v" + version
    if (tool == "go" and expected not in result.split()) or (tool == "node" and result != expected):
        raise ValueError("Installed version did not match: " + result)
    with open(os.environ["GITHUB_PATH"], "a") as output:
        output.write(str(target / "bin") + "\n")
    print(result)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("tool", choices=["go", "node"])
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--version")
    group.add_argument("--version-file")
    args = parser.parse_args()
    selector = args.version
    if args.version_file:
        if args.tool != "go":
            parser.error("--version-file is supported for go.mod only")
        module = pathlib.Path(args.version_file).read_text()
        match = re.search(r"(?m)^toolchain go([0-9.]+)\s*$", module)
        if not match:
            match = re.search(r"(?m)^go ([0-9.]+)\s*$", module)
        if not match:
            raise ValueError("No Go version in module file")
        selector = match[1]
    install(args.tool, selector)


if __name__ == "__main__":
    main()
