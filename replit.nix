{ pkgs }: {
	deps = [
	pkgs.nodejs-14_x
    pkgs.nodePackages.typescript
    pkgs.ffmpeg
    pkgs.nodePackages.yarn
    pkgs.replitPackages.jest
    pkgs.git
	];
}