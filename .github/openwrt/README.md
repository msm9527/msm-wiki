# OpenWrt package builder

The release workflows reuse the static Linux release archive and build native
`msm` and `luci-app-msm` packages without an OpenWrt SDK:

```sh
python3 .github/openwrt/build-packages.py \
  --version 1.5.0 --target linux-arm64 \
  --input dist/msm-1.5.0-linux-arm64.tar.gz \
  --output-dir dist/openwrt --format all --with-luci
```

Python 3.9+ builds IPK directly. APK v3 uses upstream `apk mkpkg`, either a native
apk-tools 3 executable (`--apk-bin` / `APK_BIN`, with root or fakeroot), or one
Docker container running `alpine:3.23`. `--format ipk` needs no Docker. APK fixes
compatibility at apk 3.0.0 and uses deflate compression because OpenWrt's apk build
does not require zstd.

The input must contain a static Linux ELF named `msm`. When present,
`THIRD_PARTY_NOTICES.md`, `OSS_PROVENANCE.md`, and
`licenses/CADDY-APACHE-2.0.txt` are included as well (older stable versions predate
the Caddy integration and these files). The binary and legal documents are preserved
byte for byte. Architecture mismatches, ELF interpreter/shared-library dependencies,
duplicate entries and symbolic links in required files are rejected. Other
archive entries are not extracted.

| Release target | OpenWrt package architectures |
| --- | --- |
| `linux-amd64` | `x86_64` |
| `linux-arm64` | `aarch64_generic`, `aarch64_cortex-a53`, `aarch64_cortex-a72` |
| `linux-armv7` | `arm_cortex-a7_neon-vfpv4`, `arm_cortex-a9_vfpv3-d16`, `arm_cortex-a9_neon`, `arm_cortex-a15_neon-vfpv4` |
| `linux-armv6` | `arm_arm1176jzf-s_vfp` |

Use repeatable `--arch` options to select architectures within a target. LuCI is
built once by the amd64 job, or for another target with `--with-luci`. IPK uses
`Architecture: all` and APK uses `arch:noarch` for LuCI; filenames use `all` for
both formats. APK filenames include the architecture so release matrix outputs
cannot overwrite one another.

Stable versions map to `1.5.0-r1`. `beta-1.5.0` maps to package metadata version
`1.5.0~beta-r1` for opkg and `1.5.0_beta-r1` for apk, so a stable package supersedes
its matching beta. IPK **filenames** use an underscore instead of a tilde, such as
`msm_1.5.0_beta-r1_x86_64.ipk`; the control file still contains
`Version: 1.5.0~beta-r1`. This prevents GitHub release asset-name normalization
from changing filenames and invalidating `SHA256SUMS` entries. APK names are unchanged.
`--release` changes the package revision. `SOURCE_DATE_EPOCH` defaults to zero.

The UCI section is `msm.main` (type `msm`): `enabled=0`,
`config_dir=/etc/msm`, `port=7777`. The package enables the procd boot script;
the UCI switch controls whether it starts MSM. Installation always reloads the
service to register its config-change trigger, including when disabled, so the
first LuCI Save & Apply can start it. Upgrades restart an enabled service,
preserve edited UCI configuration and do not touch application data.
New data directories use a `logs` symlink to `/tmp/msm/logs`; existing log
directories are left intact. The default data directory and UCI file are listed
for sysupgrade preservation. Users selecting another storage location should
include it in their own backup policy.

```sh
node --test test/openwrt-package*.test.cjs
MSM_TEST_APK=1 node --test test/openwrt-package-apk.test.cjs
```

The optional integration test performs real APK v3 installation, upgrade and
removal in an isolated root, checking permissions, edited configuration and
database preservation. Regular tests parse IPK archives and execute the service
and package lifecycle scripts with controlled OpenWrt command fixtures.

Format references:

- [OpenWrt IPK builder](https://github.com/openwrt/openwrt/blob/main/scripts/ipkg-build)
- [OpenWrt package generation and APK metadata](https://github.com/openwrt/openwrt/blob/main/include/package-pack.mk)
- [Upstream apk mkpkg](https://gitlab.alpinelinux.org/alpine/apk-tools/-/blob/master/doc/apk-mkpkg.8.scd)
- [OpenWrt apk usage](https://openwrt.org/docs/guide-user/additional-software/apk)
