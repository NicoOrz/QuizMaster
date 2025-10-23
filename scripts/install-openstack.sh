#!/usr/bin/env bash
set -euo pipefail

# OpenStack one-click installer script
# Supports: MicroStack (Ubuntu), DevStack (Ubuntu/Debian based)
# Usage:
#   sudo ./install-openstack.sh --method microstack|devstack [--channel 2024.1] [--with-dashboard] [--non-interactive]
#   sudo ./install-openstack.sh --uninstall --method microstack|devstack
#
# Notes:
# - Requires root privileges
# - Tested on Ubuntu 22.04+. MicroStack is Ubuntu-only. DevStack is Ubuntu/Debian-like.
# - This script installs dependencies, configures networking, and brings up a minimal cloud.

METHOD=""
CHANNEL="2024.1"         # MicroStack channel (e.g., 2024.1, 2024.2)
WITH_DASHBOARD=false      # Enable Horizon when supported
NON_INTERACTIVE=false
UNINSTALL=false
FORCE_IPV4=false

# Colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m"

log() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERR ]${NC} $*" >&2; }

need_root() {
  if [[ $EUID -ne 0 ]]; then
    err "请以 root 身份运行：sudo $0 ..."
    exit 1
  fi
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

confirm() {
  if $NON_INTERACTIVE; then return 0; fi
  read -r -p "$1 [y/N]: " ans || true
  [[ ${ans:-} =~ ^([yY][eE][sS]|[yY])$ ]]
}

usage() {
  cat <<EOF
OpenStack 一键安装脚本

选项：
  --method microstack|devstack   选择安装方式
  --channel <version>            MicroStack 版本通道（默认：${CHANNEL}）
  --with-dashboard               启用 Dashboard（Horizon）
  --non-interactive              无需交互确认
  --force-ipv4                   仅使用 IPv4，禁用 IPv6
  --uninstall                    卸载已安装的 OpenStack
  -h, --help                     显示帮助

示例：
  sudo ./install-openstack.sh --method microstack --channel 2024.1 --with-dashboard
  sudo ./install-openstack.sh --method devstack --with-dashboard
  sudo ./install-openstack.sh --uninstall --method microstack
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --method)
        METHOD="$2"; shift 2 ;;
      --channel)
        CHANNEL="$2"; shift 2 ;;
      --with-dashboard)
        WITH_DASHBOARD=true; shift ;;
      --non-interactive)
        NON_INTERACTIVE=true; shift ;;
      --uninstall)
        UNINSTALL=true; shift ;;
      --force-ipv4)
        FORCE_IPV4=true; shift ;;
      -h|--help)
        usage; exit 0 ;;
      *)
        err "未知参数：$1"; usage; exit 1 ;;
    esac
  done

  if [[ -z "$METHOD" ]]; then
    err "必须指定 --method microstack|devstack"; usage; exit 1
  fi
}

os_detect() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_ID=${ID:-unknown}
    OS_VER=${VERSION_ID:-unknown}
  else
    OS_ID=unknown
    OS_VER=unknown
  fi
  log "检测到系统：${OS_ID} ${OS_VER}"
}

ensure_ipv4_only() {
  if ! $FORCE_IPV4; then return 0; fi
  log "禁用 IPv6 并强制使用 IPv4..."
  sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null || true
  sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null || true
  sysctl -w net.ipv6.conf.lo.disable_ipv6=1 >/dev/null || true
  echo -e 'Acquire::ForceIPv4 "true";' >/etc/apt/apt.conf.d/99force-ipv4 || true
}

apt_update() {
  if have_cmd apt-get; then
    log "更新 apt 包索引..."
    DEBIAN_FRONTEND=noninteractive apt-get update -y
  fi
}

install_pkgs() {
  if have_cmd apt-get; then
    local pkgs=(curl ca-certificates gnupg lsb-release git jq net-tools software-properties-common)
    log "安装基础依赖：${pkgs[*]}"
    DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}"
  fi
}

install_microstack() {
  if [[ ${OS_ID} != "ubuntu" ]]; then
    err "MicroStack 仅支持 Ubuntu 系统。检测到：${OS_ID}"; exit 1
  fi

  if ! have_cmd snap; then
    log "安装 snapd..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y snapd
  fi

  log "安装 MicroStack (${CHANNEL})..."
  snap install microstack --channel="${CHANNEL}/stable" --classic

  log "初始化 MicroStack（这可能需要数分钟）..."
  if $WITH_DASHBOARD; then
    microstack init --auto --control --setup-hypervisor --setup-docker --setup-dashboard
  else
    microstack init --auto --control --setup-hypervisor --setup-docker
  fi

  ok "MicroStack 安装完成。"
  echo
  microstack status || true
  echo
  log "默认账户：用户名 admin，密码位于：/var/snap/microstack/common/etc/microstack.rc"
}

uninstall_microstack() {
  if have_cmd snap; then
    log "卸载 MicroStack..."
    snap remove --purge microstack || true
  fi
  ok "MicroStack 卸载完成"
}

install_devstack() {
  if [[ ${OS_ID} != "ubuntu" && ${OS_ID} != "debian" ]]; then
    warn "未在 Ubuntu/Debian 上。尝试继续，但可能失败：${OS_ID}"
  fi

  apt_update
  install_pkgs

  if ! id -u stack >/dev/null 2>&1; then
    log "创建 devstack 用户 'stack'..."
    useradd -s /bin/bash -d /opt/stack -m stack
    echo "stack ALL=(ALL) NOPASSWD: ALL" >/etc/sudoers.d/stack
    chmod 0440 /etc/sudoers.d/stack
  fi

  if [[ ! -d /opt/devstack ]]; then
    log "克隆 DevStack..."
    git clone https://opendev.org/openstack/devstack /opt/devstack
    chown -R stack:stack /opt/devstack
  fi

  if [[ ! -f /opt/devstack/local.conf ]]; then
    log "生成 /opt/devstack/local.conf"
    cat >/opt/devstack/local.conf <<'CONF'
[[local|localrc]]
ADMIN_PASSWORD=secret
DATABASE_PASSWORD=$ADMIN_PASSWORD
RABBIT_PASSWORD=$ADMIN_PASSWORD
SERVICE_PASSWORD=$ADMIN_PASSWORD
SERVICE_TOKEN=$ADMIN_PASSWORD

HOST_IP=127.0.0.1
LOGFILE=/opt/stack/logs/stack.sh.log
LOG_COLOR=False

# 可根据需要启用 Horizon
enable_service horizon

# 启用最小必要服务
disable_service tempest
CONF
    chown stack:stack /opt/devstack/local.conf
  fi

  log "启动 DevStack 安装（时间较长）..."
  sudo -u stack -H bash -lc "/opt/devstack/stack.sh"

  ok "DevStack 安装完成。使用：source /opt/devstack/openrc admin admin"
}

uninstall_devstack() {
  if [[ -d /opt/devstack ]]; then
    log "执行 DevStack 清理..."
    sudo -u stack -H bash -lc "/opt/devstack/unstack.sh || true"
    sudo -u stack -H bash -lc "/opt/devstack/clean.sh || true"
    rm -rf /opt/stack /opt/devstack
    userdel -r stack || true
    rm -f /etc/sudoers.d/stack || true
  fi
  ok "DevStack 卸载完成"
}

main() {
  need_root
  parse_args "$@"
  os_detect
  ensure_ipv4_only
  apt_update
  install_pkgs

  if $UNINSTALL; then
    case "$METHOD" in
      microstack) uninstall_microstack ;;
      devstack) uninstall_devstack ;;
      *) err "未知安装方式：$METHOD"; exit 1 ;;
    esac
    exit 0
  fi

  case "$METHOD" in
    microstack) install_microstack ;;
    devstack) install_devstack ;;
    *) err "未知安装方式：$METHOD"; usage; exit 1 ;;
  esac
}

main "$@"
