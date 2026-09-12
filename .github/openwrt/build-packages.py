#!/usr/bin/env python3
"""Build native OpenWrt IPK and APK v3 packages from a static MSM release archive.

IPK layout follows openwrt/openwrt scripts/ipkg-build. APK is always generated
by upstream apk mkpkg, as in OpenWrt include/package-pack.mk; no APK v2 encoder.
Python 3.9+ is sufficient for IPK. APK additionally needs apk-tools 3 + fakeroot
(unless running as root), or Docker. No OpenWrt SDK or target compiler is used.
"""

import argparse
import gzip
import hashlib
import io
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import shlex
import struct
import subprocess
import sys
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent
ARCHITECTURES = {
    "linux-amd64": (62, 2, ["x86_64"]),
    "linux-arm64": (183, 2, ["aarch64_generic", "aarch64_cortex-a53", "aarch64_cortex-a72"]),
    "linux-armv7": (40, 1, ["arm_cortex-a7_neon-vfpv4", "arm_cortex-a9_vfpv3-d16", "arm_cortex-a9_neon", "arm_cortex-a15_neon-vfpv4"]),
    "linux-armv6": (40, 1, ["arm_arm1176jzf-s_vfp"]),
}
APK_IMAGE = "alpine:3.23"
RELEASE_DOCUMENTS = ("THIRD_PARTY_NOTICES.md", "OSS_PROVENANCE.md", "licenses/CADDY-APACHE-2.0.txt")


def package_version(version, release):
    """Return APK's version; build_ipk translates prerelease ordering to '~'."""
    beta = version.startswith("beta-")
    value = version[5:] if beta else version
    value = value.removeprefix("v")
    match = re.fullmatch(r"(\d+(?:\.\d+)*)(?:[-_](alpha|beta|pre|rc)(?:[.-]?(\d+))?)?", value)
    if not match:
        raise ValueError("version must be numeric (for example 1.5.0, v1.5.0, beta-1.5.0 or 1.5.0-rc.1)")
    base, stage, number = match.groups()
    if beta and stage and stage != "beta":
        raise ValueError("beta prefix conflicts with version prerelease suffix")
    stage = stage or ("beta" if beta else None)
    return base + ("_" + stage + (number or "") if stage else "") + "-r" + str(release)


def read_release(archive, target):
    # Read just one regular file. Never extract arbitrary archive paths/symlinks.
    with tarfile.open(archive, "r:gz") as tar:
        files = {}
        for name in ("msm",) + RELEASE_DOCUMENTS:
            candidates = [m for m in tar.getmembers() if PurePosixPath(m.name).as_posix() == name]
            # Older stable releases predate the embedded Caddy integration and
            # do not include these notices. Preserve every notice when present.
            if not candidates and name != "msm":
                continue
            if len(candidates) != 1 or not candidates[0].isfile():
                raise ValueError("release archive must contain one regular " + name + " file")
            files[name] = tar.extractfile(candidates[0]).read()
    validate_elf(files["msm"], target)
    return files


def validate_elf(binary, target):
    machine, elf_class, _ = ARCHITECTURES[target]
    if len(binary) < 64 or binary[:4] != b"\x7fELF" or binary[4] != elf_class or binary[5] != 1:
        raise ValueError("msm must be a little-endian Linux ELF matching " + target)
    if struct.unpack_from("<H", binary, 18)[0] != machine:
        raise ValueError("ELF machine does not match " + target)
    if elf_class == 2:
        phoff = struct.unpack_from("<Q", binary, 32)[0]
        phentsize, phnum = struct.unpack_from("<HH", binary, 54)
        minimum = 56
    else:
        phoff = struct.unpack_from("<I", binary, 28)[0]
        phentsize, phnum = struct.unpack_from("<HH", binary, 42)
        minimum = 32
    if phnum == 0 or phentsize < minimum or phoff + phentsize * phnum > len(binary):
        raise ValueError("malformed ELF program headers")
    for index in range(phnum):
        offset = phoff + index * phentsize
        kind = struct.unpack_from("<I", binary, offset)[0]
        if kind == 3:  # PT_INTERP
            raise ValueError("dynamically linked MSM cannot be packaged; use the static Linux release")
        if kind == 2:  # PT_DYNAMIC: reject DT_NEEDED even for binaries without PT_INTERP.
            if elf_class == 2:
                start = struct.unpack_from("<Q", binary, offset + 8)[0]
                size = struct.unpack_from("<Q", binary, offset + 32)[0]
                step, fmt = 16, "<Q"
            else:
                start = struct.unpack_from("<I", binary, offset + 4)[0]
                size = struct.unpack_from("<I", binary, offset + 16)[0]
                step, fmt = 8, "<I"
            if start + size > len(binary):
                raise ValueError("malformed ELF dynamic section")
            for pos in range(start, start + size, step):
                tag = struct.unpack_from(fmt, binary, pos)[0]
                if tag == 0:
                    break
                if tag == 1:
                    raise ValueError("ELF has shared-library dependencies; use a static Linux release")


def write(path, contents, mode=0o644):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(contents if isinstance(contents, bytes) else contents.encode())
    path.chmod(mode)


def prepare_tree(root, name, release_files):
    shutil.copytree(HERE / "files" / name, root)
    executables = {"etc/init.d/msm", "usr/libexec/rpcd/msm"}
    for path in root.rglob("*"):
        path.chmod(0o755 if path.is_dir() or path.relative_to(root).as_posix() in executables else 0o644)
    if name == "msm":
        write(root / "usr/bin/msm", release_files["msm"], 0o755)
        for document in RELEASE_DOCUMENTS:
            if document in release_files:
                write(root / "usr/share/doc/msm" / document, release_files[document])
    root.chmod(0o755)


def scripts_for(name, kind):
    if name == "msm":
        if kind == "ipk":
            return {"postinst": "msm-postinst", "prerm": "msm-prerm"}
        return {"post-install": "msm-postinst", "post-upgrade": "msm-postinst", "pre-upgrade": "msm-pre-upgrade", "pre-deinstall": "msm-prerm"}
    if kind == "ipk":
        return {"postinst": "luci-postinst", "postrm": "luci-postinst"}
    return {"post-install": "luci-postinst", "post-upgrade": "luci-postinst", "post-deinstall": "luci-postinst"}


def tar_gz(entries, epoch):
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb", filename="", mtime=epoch) as gz:
        with tarfile.open(fileobj=gz, mode="w", format=tarfile.GNU_FORMAT) as tar:
            for name, data, mode, is_dir in entries:
                info = tarfile.TarInfo("./" + name)
                info.uid = info.gid = 0
                info.uname = info.gname = "root"
                info.mtime = epoch
                info.mode = mode
                info.size = 0 if is_dir else len(data)
                if is_dir:
                    info.type = tarfile.DIRTYPE
                tar.addfile(info, None if is_dir else io.BytesIO(data))
    return out.getvalue()


def tree_entries(root):
    return [(p.relative_to(root).as_posix(), b"" if p.is_dir() else p.read_bytes(), p.stat().st_mode & 0o777, p.is_dir()) for p in sorted(root.rglob("*"))]


def metadata(name):
    if name == "msm":
        return "MSM DNS and network services manager", ["procd", "uci", "ca-bundle"]
    return "LuCI dashboard and service controls for MSM", ["msm", "luci-base", "rpcd", "ubus", "uci", "jsonfilter", "jshn"]


def build_ipk(root, name, version, arch, output, epoch):
    # opkg follows Debian ordering: '~beta' sorts below the corresponding stable
    # release. APK uses '_beta' for the same semantic ordering instead.
    version = version.replace("_", "~", 1)
    description, dependencies = metadata(name)
    data = tar_gz(tree_entries(root), epoch)
    fields = {"Package": name, "Version": version, "Architecture": arch, "Maintainer": "MSM Team", "Section": "net" if name == "msm" else "luci", "Priority": "optional", "License": "Proprietary", "Depends": ", ".join(dependencies), "Installed-Size": str(len(gzip.decompress(data))), "Source": "https://github.com/msm9527/msm", "Description": description}
    controls = [("control", ("\n".join(k + ": " + v for k, v in fields.items()) + "\n").encode(), 0o644, False)]
    for phase, script in scripts_for(name, "ipk").items():
        controls.append((phase, (HERE / "scripts" / script).read_bytes(), 0o755, False))
    if name == "msm":
        controls.append(("conffiles", b"/etc/config/msm\n", 0o644, False))
    package = tar_gz([("debian-binary", b"2.0\n", 0o644, False), ("data.tar.gz", data, 0o644, False), ("control.tar.gz", tar_gz(controls, epoch), 0o644, False)], epoch)
    # GitHub normalizes '~' in release asset names. Keep it only in control
    # metadata so prerelease ordering works and checksum filenames stay valid.
    filename_version = version.replace("~", "_")
    path = output / (name + "_" + filename_version + "_" + arch + ".ipk")
    path.write_bytes(package)
    return path


def apk_command(explicit):
    binary = explicit or os.environ.get("APK_BIN") or shutil.which("apk")
    if binary:
        if not shutil.which(binary):
            raise ValueError("APK_BIN / --apk-bin must name an executable apk-tools 3 binary")
        prefix = []
        if os.geteuid() != 0:
            fakeroot = shutil.which("fakeroot")
            if fakeroot:
                prefix = [fakeroot]
            elif explicit or os.environ.get("APK_BIN"):
                raise ValueError("native apk requires root or fakeroot to record root-owned package files")
            else:
                binary = None
        if binary:
            result = subprocess.run([binary, "--version"], check=True, capture_output=True, text=True)
            if not re.search(r"apk-tools 3\.", result.stdout):
                raise ValueError("APK v3 requires apk-tools 3 with the mkpkg command")
            return prefix + [binary]
    if not shutil.which("docker"):
        raise ValueError("APK v3 needs apk-tools 3 + fakeroot, or Docker (alpine:3.23); use --format ipk for IPK only")
    return None


def build_apk(root, name, version, arch, output, epoch, native, work, docker_jobs):
    description, dependencies = metadata(name)
    # OpenWrt's sysupgrade helpers consume these files in addition to APK's own
    # protected /etc semantics. Keep generated application data out of payloads.
    info_dir = root / "lib/apk/packages"
    if name == "msm":
        config = root / "etc/config/msm"
        write(info_dir / (name + ".conffiles"), "/etc/config/msm\n")
        write(info_dir / (name + ".conffiles_static"), "/etc/config/msm " + hashlib.sha256(config.read_bytes()).hexdigest() + "\n")
    paths = sorted("/" + p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())
    write(info_dir / (name + ".list"), "\n".join(paths) + "\n")
    filename = name + "-" + version + "_" + arch + ".apk"
    temporary_output = work / filename
    # OpenWrt builds apk without zstd: always use portable deflate explicitly.
    args = ["mkpkg", "--compat", "3.0.0", "--compression", "deflate", "--info", "name:" + name, "--info", "version:" + version,
            "--info", "arch:" + ("noarch" if arch == "all" else arch), "--info", "description:" + description,
            "--info", "license:Proprietary", "--info", "origin:msm", "--info", "url:https://github.com/msm9527/msm",
            "--info", "maintainer:MSM Team", "--info", "depends:" + " ".join(dependencies)]
    scripts_dir = work / "scripts"
    scripts_dir.mkdir(exist_ok=True)
    for phase, script in scripts_for(name, "apk").items():
        target = scripts_dir / script
        shutil.copyfile(HERE / "scripts" / script, target)
        args.extend(["--script", phase + ":" + (str(target) if native else "/work/scripts/" + script)])
    environment = dict(os.environ, SOURCE_DATE_EPOCH=str(epoch))
    if native:
        args.extend(["--files", str(root), "--output", str(temporary_output)])
        subprocess.run(native[:-1] + ["sh", "-ec", 'chown -R 0:0 "$1"; shift; exec "$@"', "build-apk", str(root), native[-1]] + args, check=True, env=environment)
    else:
        args.extend(["--files", "/tmp/package", "--output", "/work/" + filename])
        docker_jobs.append("cp -a " + shlex.quote("/work/" + root.name) + " /tmp/package\nchown -R 0:0 /tmp/package\n" + shlex.join(["apk"] + args) + "\nrm -rf /tmp/package\n")
        return output / filename
    return finish_apk(temporary_output, output)


def finish_apk(temporary_output, output):
    if temporary_output.read_bytes()[:3] != b"ADB":
        raise ValueError("apk mkpkg did not produce an APK v3 (ADB) file")
    path = output / temporary_output.name
    shutil.copyfile(temporary_output, path)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--version", required=True)
    parser.add_argument("--release", type=int, default=1, help="MSM core package revision (default: %(default)s)")
    parser.add_argument("--luci-release", type=int, default=2, help="LuCI package revision (default: %(default)s)")
    parser.add_argument("--target", choices=ARCHITECTURES)
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--format", choices=["ipk", "apk", "all"], default="all")
    parser.add_argument("--arch", action="append", help="Build only these package architectures from the target's supported list")
    parser.add_argument("--with-luci", action="store_true", help="Also build LuCI; automatic for linux-amd64")
    parser.add_argument("--luci-only", action="store_true", help="Build only architecture-independent LuCI packages; no --target or --input required")
    parser.add_argument("--apk-bin", help="Use a native apk-tools 3 executable")
    parser.add_argument("--apk-image", default=APK_IMAGE, help="Docker APK builder image (default: %(default)s)")
    args = parser.parse_args()
    if args.release < 1:
        parser.error("--release must be positive")
    if args.luci_release < 1:
        parser.error("--luci-release must be positive")
    if not args.luci_only and (not args.target or not args.input):
        parser.error("--target and --input are required unless --luci-only is used")
    if args.luci_only and args.arch:
        parser.error("--arch cannot be used with --luci-only")
    try:
        versions = {"msm": package_version(args.version, args.release), "luci-app-msm": package_version(args.version, args.luci_release)}
        arches = [] if args.luci_only else args.arch or ARCHITECTURES[args.target][2]
        if any(arch not in ARCHITECTURES[args.target][2] for arch in arches):
            raise ValueError("architecture is not supported by target " + args.target)
        release_files = {} if args.luci_only else read_release(args.input, args.target)
        native = apk_command(args.apk_bin) if args.format != "ipk" else None
        epoch = int(os.environ.get("SOURCE_DATE_EPOCH", "0"))
        args.output_dir.mkdir(parents=True, exist_ok=True)
        packages = []
        with tempfile.TemporaryDirectory(prefix="msm-openwrt-") as temporary:
            work = Path(temporary)
            docker_jobs = []
            entries = [("msm", arch) for arch in arches]
            if args.luci_only or args.with_luci or args.target == "linux-amd64":
                entries.append(("luci-app-msm", "all"))
            for name, arch in entries:
                root = work / (name + "-" + arch)
                prepare_tree(root, name, release_files)
                if args.format != "apk":
                    packages.append(build_ipk(root, name, versions[name], arch, args.output_dir, epoch))
                if args.format != "ipk":
                    packages.append(build_apk(root, name, versions[name], arch, args.output_dir, epoch, native, work, docker_jobs))
            if docker_jobs:
                # One container per target, copying before chown so host files
                # retain their ownership. Network is unnecessary after image pull.
                write(work / "build-apks.sh", "#!/bin/sh\nset -eu\n" + "\n".join(docker_jobs), 0o755)
                subprocess.run(["docker", "run", "--rm", "--network", "none", "-e", "SOURCE_DATE_EPOCH=" + str(epoch), "-v", str(work) + ":/work", args.apk_image, "sh", "/work/build-apks.sh"], check=True)
                for path in packages:
                    if path.suffix == ".apk":
                        finish_apk(work / path.name, args.output_dir)
        for path in packages:
            print(path)
    except (ValueError, OSError, tarfile.TarError, subprocess.CalledProcessError, struct.error) as error:
        parser.exit(1, "error: " + str(error) + "\n")


if __name__ == "__main__":
    main()
