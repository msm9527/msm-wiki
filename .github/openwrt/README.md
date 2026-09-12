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
`--release` changes the core package revision (default `1`); `--luci-release`
changes only the LuCI revision (default `2`). `SOURCE_DATE_EPOCH` defaults to zero.
The release workflow publishes OpenWrt packages only on the Beta channel.

Build a LuCI update without a core archive or a core rebuild:

```sh
python3 .github/openwrt/build-packages.py \
  --version beta-1.5.0 --luci-only --luci-release 2 \
  --format all --output-dir dist/luci
```

The dashboard uses its own bounded rpcd helper for status, service actions and
logs. Saving commits only the `msm` UCI configuration. LuCI package upgrades
reload rpcd and refresh the plugin's resource timestamps; they do not restart
MSM or replace its binary. The new dashboard view path bypasses cached r1 assets.

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
node --test test/openwrt-*.test.cjs
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

## Repairing an existing Beta mirror

After correcting GitHub IPK asset names and its `SHA256SUMS`, the manual
`openwrt-repair-mirror.yml` workflow can repair an already uploaded mirror without
rebuilding or replacing package contents. Supply the numeric Beta tag and its
original daily Beta run ID. That run must have completed its mirror upload;
its exact `msm-<tag>-checksums` artifact must match every published file hash after
normalizing only the old IPK filenames.

The workflow validates the complete mirror before making changes, copies verified
legacy IPKs to canonical names, keeps IPKs and the manifest readable with mode
0644, verifies the complete manifest, and atomically replaces `SHA256SUMS` before
removing verified old aliases. Existing canonical files are checked on reruns.
It uses the same `DEPLOY_SERVERS` configuration as the daily publisher and changes
only `<target>/beta/<tag>`. The remote mirror requires Bash and GNU coreutils.
Local mirror tests on macOS use GNU `gmv` from `brew install coreutils`.

## DNS and port handoff

MSM's Beta core package revision 2 checks the active MosDNS, Mihomo and Sing-box
TCP/UDP listeners before starting a component. On OpenWrt, when port 53 belongs
to the system dnsmasq, MSM temporarily disables only that instance's DNS listener
and retains DHCP. The original port setting is saved before any change and is
restored after the final managed DNS owner stops or fails to start. User edits
made while DNS is leased are preserved. Other occupied ports are reported with
their protocol, address and process when available; unrelated services are not
terminated automatically.

The service and package hooks request DNS recovery and propagate failures, but
apk v3 may still remove or replace the executable after a hook fails. Before
upgrading or removing packages, require a successful stop with `&&`:

```sh
# Upgrade
/etc/init.d/msm stop && apk add --allow-untrusted ./msm-*.apk ./luci-app-msm-*.apk

# Or remove
/etc/init.d/msm stop && apk del luci-app-msm msm
```

The init script reads the configured data directory. If stop fails, do not
continue the package operation: resolve the conflict or use the existing
`msm service recover-dns -c /etc/msm --wait 40s` after stopping managed services,
substituting a custom data directory when needed. Recovery refuses to restore
dnsmasq while a managed process is running or another service occupies its DNS
port. Configuration and lease data are retained; retention of the executable
after a failed package hook is not guaranteed.

## Updating only the Beta LuCI plugin

Run `openwrt-update-luci.yml` on `main` with an existing numeric Beta tag and a
LuCI revision. It builds only the architecture-independent IPK and APK, protects
all core and desktop asset hashes, and updates the two LuCI filenames and their
entries in the complete checksum manifest. Mirror preflight runs before GitHub
publication; old LuCI assets are removed only after mirror verification. Backups
and the update plan are retained as a workflow artifact. A revision already
published with different contents is rejected and requires a higher revision.

Before replacing `SHA256SUMS`, the workflow uploads and verifies a temporary
`SHA256SUMS.luci-backup` release asset. If a runner stops after deleting the old
manifest, rerunning with the same tag, revision and package contents verifies
every backup entry against the release before restoring the manifest. The backup
is removed after all mirrors and new assets are verified. If both manifests are
missing or a backup fails validation, restore the saved workflow artifact before
retrying; the workflow stops instead of guessing package hashes.
