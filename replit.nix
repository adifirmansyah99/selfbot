{ pkgs }: {
	deps = [
	pkgs.nodejs-14_x
    pkgs.nodePackages.typescript-language-server
    pkgs.arcan.ffmpeg
    pkgs.libwebp
    pkgs.nodePackages.yarn
    pkgs.replitPackages.jest
	];
}