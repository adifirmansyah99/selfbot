{ pkgs }: {
	deps = [
	pkgs.nodejs-16_x
    pkgs.nodePackages.typescript-language-server
    pkgs.ffmpeg
    pkgs.nodePackages.yarn
    pkgs.replitPackages.jest
    pkgs.git
	];
}