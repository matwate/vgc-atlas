{
  description = "VGC Atlas Frontend + Backend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        lib = pkgs.lib;

        # ----------------------------------------------------------------- #
        # Backend: Python 3.13 + deps from pyproject.toml (uv.lock tracked
        # outside nix; here we mirror the declared deps as nixpkgs packages).
        # ----------------------------------------------------------------- #
        pythonEnv = pkgs.python313.withPackages (ps: with ps; [
          fastapi
          uvicorn
          httpx
          jq
          loguru
          parsel
          pydantic
          rich
          typer
          # uvicorn[standard] extras:
          uvloop
          httptools
          watchfiles
          websockets
        ]);

        # Backend source tree copied to a writable STATE_DIR at runtime.
        # data/teams.jsonl is shipped as the initial seed; teams.db is
        # built lazily by api.py's startup hook if missing.
        backendSource = pkgs.runCommand "vgc-backend-source" { } ''
          mkdir -p $out/scripts $out/data
          cp ${./api.py}                       $out/api.py
          cp ${./store.py}                     $out/store.py
          cp ${./search.py}                    $out/search.py
          cp ${./fetcher.py}                   $out/fetcher.py
          cp ${./scripts/rebuild_store.py}     $out/scripts/rebuild_store.py
          cp ${./scripts/flatten_teams.py}    $out/scripts/flatten_teams.py
          cp ${./scripts/fetch_sprites.py}    $out/scripts/fetch_sprites.py
          cp ${./scripts/fetch_new_data.py}    $out/scripts/fetch_new_data.py
          cp ${./data/teams.jsonl}             $out/data/teams.jsonl
        '';

        # ----------------------------------------------------------------- #
        # Frontend: Vite SPA build (npm ci + vite build, outputs dist/).
        # NOTE: sprites under frontend/public/{sprites,art}/ are gitignored
        # and will NOT appear in the nix build. Either populate them before
        # building (run scripts/fetch_sprites.py) and override `src`, or
        # accept broken pokemon artwork in the built bundle.
        # ----------------------------------------------------------------- #
        frontendDist = pkgs.buildNpmPackage {
          pname = "vgc-atlas-frontend";
          version = "0.1.0";
          src = ./frontend;
          npmDepsHash = "sha256-uT1uV1NJSCgNpmskwDrG95SEbYcbXQQU/qwCk2i1fdE=";
          # Allow esbuild's postinstall (sets up the platform binary symlink
          # used by vite during `vite build`). Written to .npmrc so npm
          # accepts it for a project-scoped install.
          postPatch = ''
            echo "allow-scripts=true" >> .npmrc
          '';
          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r dist/* $out/
            runHook postInstall
          '';
        };

        # ----------------------------------------------------------------- #
        # Launcher: copies backend sources + initial data into STATE_DIR,
        # starts uvicorn (backend on 127.0.0.1:8000) and Caddy (frontend
        # + /api reverse proxy with SPA fallback) in one process tree.
        # ----------------------------------------------------------------- #
        runScript = pkgs.writeShellScriptBin "vgc-atlas" ''
          set -euo pipefail

          STATE_DIR="''${STATE_DIR:-/var/lib/vgc-atlas}"
          BIND="''${BIND:-0.0.0.0}"
          PORT="''${PORT:-8080}"
          API_HOST="''${API_HOST:-127.0.0.1}"
          API_PORT="''${API_PORT:-8000}"

          mkdir -p "$STATE_DIR/data" "$STATE_DIR/scripts"

          # Refresh immutable source files from the nix store on every launch.
          cp -f ${backendSource}/api.py            "$STATE_DIR/"
          cp -f ${backendSource}/store.py          "$STATE_DIR/"
          cp -f ${backendSource}/search.py         "$STATE_DIR/"
          cp -f ${backendSource}/fetcher.py        "$STATE_DIR/"
          cp -f ${backendSource}/scripts/*.py      "$STATE_DIR/scripts/"
          chmod -R u+w "$STATE_DIR" "$STATE_DIR/scripts"

          # Seed the initial teams.jsonl only if missing — preserve any
          # state written by the 6h rebuild loop across restarts.
          if [ ! -f "$STATE_DIR/data/teams.jsonl" ]; then
            cp -f ${backendSource}/data/teams.jsonl "$STATE_DIR/data/teams.jsonl"
          fi

          cat > "$STATE_DIR/Caddyfile" <<EOF
          {
            auto_https off
          }
          :$PORT {
            bind $BIND
            handle /api/* {
              uri strip_prefix /api
              reverse_proxy $API_HOST:$API_PORT
            }
            handle {
              root * ${frontendDist}
              try_files {path} /index.html
              file_server
            }
          }
          EOF

          echo "[run] uvicorn on $API_HOST:$API_PORT"
          (
            cd "$STATE_DIR"
            PYTHONPATH="$STATE_DIR" \
            exec ${pythonEnv}/bin/python -m uvicorn api:app \
              --host "$API_HOST" --port "$API_PORT"
          ) &
          API_PID=$!

          cleanup() {
            kill "$API_PID" 2>/dev/null || true
            wait "$API_PID" 2>/dev/null || true
          }
          trap cleanup EXIT INT TERM

          echo "[run] caddy on $BIND:$PORT"
          ${pkgs.caddy}/bin/caddy run --config "$STATE_DIR/Caddyfile" --adapter caddyfile
        '';

      in {
        packages = {
          inherit frontendDist backendSource;
          default = pkgs.buildEnv {
            name = "vgc-atlas-${system}";
            paths = [ runScript pkgs.caddy ];
            meta.mainProgram = "vgc-atlas";
          };
        };

        apps.default = {
          type = "app";
          program = "${runScript}/bin/vgc-atlas";
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            pythonEnv
            uv
            nodejs_22
            caddy
            sqlite-interactive
          ];
          shellHook = ''
            echo "[devshell] backend:  uv run uvicorn api:app --host 127.0.0.1 --port 8000"
            echo "[devshell] frontend: cd frontend && npm run dev   (proxies /api -> :8000)"
          '';
        };
      });
}