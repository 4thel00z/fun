#!/usr/bin/env bash
set -euo pipefail

platform=$(uname -ms)

if [[ ${OS:-} = Windows_NT ]]; then
  if [[ $platform != MINGW64* ]]; then
    powershell -c "irm fun.dev/install.ps1|iex"
    exit $?
  fi
fi

# Reset
Color_Off=''

# Regular Colors
Red=''
Green=''
Dim='' # White

# Bold
Bold_White=''
Bold_Green=''

if [[ -t 1 ]]; then
    # Reset
    Color_Off='\033[0m' # Text Reset

    # Regular Colors
    Red='\033[0;31m'   # Red
    Green='\033[0;32m' # Green
    Dim='\033[0;2m'    # White

    # Bold
    Bold_Green='\033[1;32m' # Bold Green
    Bold_White='\033[1m'    # Bold White
fi

error() {
    echo -e "${Red}error${Color_Off}:" "$@" >&2
    exit 1
}

info() {
    echo -e "${Dim}$@ ${Color_Off}"
}

info_bold() {
    echo -e "${Bold_White}$@ ${Color_Off}"
}

success() {
    echo -e "${Green}$@ ${Color_Off}"
}

command -v unzip >/dev/null ||
    error 'unzip is required to install fun'

if [[ $# -gt 2 ]]; then
    error 'Too many arguments, only 2 are allowed. The first can be a specific tag of fun to install. (e.g. "fun-v0.1.4") The second can be a build variant of fun to install. (e.g. "debug-info")'
fi

case $platform in
'Darwin x86_64')
    target=darwin-x64
    ;;
'Darwin arm64')
    target=darwin-aarch64
    ;;
'Linux aarch64' | 'Linux arm64')
    target=linux-aarch64
    ;;
'MINGW64'*'ARM64'* | 'MINGW64'*'aarch64'*)
    target=windows-aarch64
    ;;
'MINGW64'*)
    target=windows-x64
    ;;
'Linux riscv64')
    error 'Not supported on riscv64'
    ;;
'Linux x86_64' | *)
    target=linux-x64
    ;;
esac

case "$target" in
'linux'*)
    if [ -f /etc/alpine-release ]; then
        target="$target-musl"
    fi
    ;;
esac

if [[ $target = darwin-x64 ]]; then
    # Is this process running in Rosetta?
    # redirect stderr to devnull to avoid error message when not running in Rosetta
    if [[ $(sysctl -n sysctl.proc_translated 2>/dev/null) = 1 ]]; then
        target=darwin-aarch64
        info "Your shell is running in Rosetta 2. Downloading fun for $target instead"
    fi
fi

GITHUB=${GITHUB-"https://github.com"}

github_repo="$GITHUB/underdoc-org/fun"

# If AVX2 isn't supported, use the -baseline build
case "$target" in
'darwin-x64'*)
    if [[ $(sysctl -a | grep machdep.cpu | grep AVX2) == '' ]]; then
        target="$target-baseline"
    fi
    ;;
'linux-x64'*)
    # If AVX2 isn't supported, use the -baseline build
    if [[ $(cat /proc/cpuinfo | grep avx2) = '' ]]; then
        target="$target-baseline"
    fi
    ;;
esac

exe_name=fun

if [[ $# = 2 && $2 = debug-info ]]; then
    target=$target-profile
    exe_name=fun-profile
    info "You requested a debug build of fun. More information will be shown if a crash occurs."
fi

if [[ $# = 0 ]]; then
    fun_uri=$github_repo/releases/latest/download/fun-$target.zip
else
    fun_uri=$github_repo/releases/download/$1/fun-$target.zip
fi

install_env=FUN_INSTALL
bin_env=\$$install_env/bin

install_dir=${!install_env:-$HOME/.fun}
bin_dir=$install_dir/bin
exe=$bin_dir/fun

if [[ ! -d $bin_dir ]]; then
    mkdir -p "$bin_dir" ||
        error "Failed to create install directory \"$bin_dir\""
fi

curl --fail --location --progress-bar --output "$exe.zip" "$fun_uri" ||
    error "Failed to download fun from \"$fun_uri\""

unzip -oqd "$bin_dir" "$exe.zip" ||
    error 'Failed to extract fun'

mv "$bin_dir/fun-$target/$exe_name" "$exe" ||
    error 'Failed to move extracted fun to destination'

chmod +x "$exe" ||
    error 'Failed to set permissions on fun executable'

rm -r "$bin_dir/fun-$target" "$exe.zip"

tildify() {
    if [[ $1 = $HOME/* ]]; then
        local replacement=\~/

        echo "${1/$HOME\//$replacement}"
    else
        echo "$1"
    fi
}

success "fun was installed successfully to $Bold_Green$(tildify "$exe")"

if command -v fun >/dev/null; then
    # Install completions, but we don't care if it fails
    IS_FUN_AUTO_UPDATE=true $exe completions &>/dev/null || :

    echo "Run 'fun --help' to get started"
    exit
fi

refresh_command=''

tilde_bin_dir=$(tildify "$bin_dir")
quoted_install_dir=\"${install_dir//\"/\\\"}\"

if [[ $quoted_install_dir = \"$HOME/* ]]; then
    quoted_install_dir=${quoted_install_dir/$HOME\//\$HOME/}
fi

echo

case $(basename "$SHELL") in
fish)
    # Install completions, but we don't care if it fails
    IS_FUN_AUTO_UPDATE=true SHELL=fish $exe completions &>/dev/null || :

    commands=(
        "set --export $install_env $quoted_install_dir"
        "set --export PATH $bin_env \$PATH"
    )

    fish_config=$HOME/.config/fish/config.fish
    tilde_fish_config=$(tildify "$fish_config")

    if [[ -w $fish_config ]]; then
        {
            echo -e '\n# fun'

            for command in "${commands[@]}"; do
                echo "$command"
            done
        } >>"$fish_config"

        info "Added \"$tilde_bin_dir\" to \$PATH in \"$tilde_fish_config\""

        refresh_command="source $tilde_fish_config"
    else
        echo "Manually add the directory to $tilde_fish_config (or similar):"

        for command in "${commands[@]}"; do
            info_bold "  $command"
        done
    fi
    ;;
zsh)
    # Install completions, but we don't care if it fails
    IS_FUN_AUTO_UPDATE=true SHELL=zsh $exe completions &>/dev/null || :

    commands=(
        "export $install_env=$quoted_install_dir"
        "export PATH=\"$bin_env:\$PATH\""
    )

    zsh_config=$HOME/.zshrc
    tilde_zsh_config=$(tildify "$zsh_config")

    if [[ -w $zsh_config ]]; then
        {
            echo -e '\n# fun'

            for command in "${commands[@]}"; do
                echo "$command"
            done
        } >>"$zsh_config"

        info "Added \"$tilde_bin_dir\" to \$PATH in \"$tilde_zsh_config\""

        refresh_command="exec $SHELL"
    else
        echo "Manually add the directory to $tilde_zsh_config (or similar):"

        for command in "${commands[@]}"; do
            info_bold "  $command"
        done
    fi
    ;;
bash)
    # Install completions, but we don't care if it fails
    IS_FUN_AUTO_UPDATE=true SHELL=bash $exe completions &>/dev/null || :

    commands=(
        "export $install_env=$quoted_install_dir"
        "export PATH=\"$bin_env:\$PATH\""
    )

    bash_configs=(
        "$HOME/.bash_profile"
        "$HOME/.bashrc"
    )

    if [[ ${XDG_CONFIG_HOME:-} ]]; then
        bash_configs+=(
            "$XDG_CONFIG_HOME/.bash_profile"
            "$XDG_CONFIG_HOME/.bashrc"
            "$XDG_CONFIG_HOME/bash_profile"
            "$XDG_CONFIG_HOME/bashrc"
        )
    fi

    set_manually=true
    for bash_config in "${bash_configs[@]}"; do
        tilde_bash_config=$(tildify "$bash_config")

        if [[ -w $bash_config ]]; then
            {
                echo -e '\n# fun'

                for command in "${commands[@]}"; do
                    echo "$command"
                done
            } >>"$bash_config"

            info "Added \"$tilde_bin_dir\" to \$PATH in \"$tilde_bash_config\""

            refresh_command="source $bash_config"
            set_manually=false
            break
        fi
    done

    if [[ $set_manually = true ]]; then
        echo "Manually add the directory to $tilde_bash_config (or similar):"

        for command in "${commands[@]}"; do
            info_bold "  $command"
        done
    fi
    ;;
*)
    echo 'Manually add the directory to ~/.bashrc (or similar):'
    info_bold "  export $install_env=$quoted_install_dir"
    info_bold "  export PATH=\"$bin_env:\$PATH\""
    ;;
esac

echo
info "To get started, run:"
echo

if [[ $refresh_command ]]; then
    info_bold "  $refresh_command"
fi

info_bold "  fun --help"
