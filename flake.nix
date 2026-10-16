
{
  description = "VGC Atlas";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      inherit (pkgs) lib;
      pythonEnv = pkgs.python313.withPackages (ps: with ps; [
        fastapi httpx jq loguru parsel pydantic rich typer uvicorn
      ]);
      frontend = pkgs.buildNpmPackage {
        name = "vgc-atlas-frontend";
        src = lib.fileset.toSource {
          root = ./frontend;
          fileset = lib.fileset.unions [
            ./frontend/package.json
            ./frontend/package-lock.json
            ./frontend/index.html
            ./frontend/vite.config.js
            ./frontend/src
            ./frontend/public
          ];
        };
        npmDepsHash = "sha256-uT1uV1NJSCgNpmskwDrG95SEbYcbXQQU/qwCk2i1fdE=";
        npmBuildScript = "build";
        installPhase = "mkdir -p $out && cp -r dist/* $out/";
      };
      backend = pkgs.stdenv.mkDerivation {
        name = "vgc-atlas-backend";
        src = lib.cleanSource ./.;
        dontBuild = true;
        installPhase = ''
          mkdir -p $out/share/vgc-atlas
          cp api.py fetcher.py search.py store.py $out/share/vgc-atlas/
          cp -r scripts $out/share/vgc-atlas/
        '';
      };
      # Serves the API under /api and, when VGC_ATLAS_FRONTEND is set, the SPA at /.
      server = withFrontend: pkgs.writeShellApplication {
        name = "vgc-atlas-server";
        runtimeInputs = [ pythonEnv ];
        text = ''
          cd "''${VGC_ATLAS_ROOT:-.}"
          ${lib.optionalString withFrontend ''export VGC_ATLAS_FRONTEND="${frontend}"''}
          exec uvicorn api:app --host 0.0.0.0 --port "''${PORT:-8000}"
        '';
      };
    in {
      packages.${system} = { inherit frontend backend; default = frontend; };
      apps.${system} = {
        default = {
          type = "app";
          program = "${server true}/bin/vgc-atlas-server";
        };
        backend = {
          type = "app";
          program = "${server false}/bin/vgc-atlas-server";
        };
      };
    };
}

