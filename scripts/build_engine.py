import argparse
import os
import subprocess
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", default="photo_selector.spec")
    parser.add_argument("--dist-dir", default="dist")
    parser.add_argument("--work-dir", default=os.path.join("build", "pyinstaller"))
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    spec_path = os.path.join(repo_root, args.spec)
    dist_dir = os.path.join(repo_root, args.dist_dir)
    work_dir = os.path.join(repo_root, args.work_dir)

    if not os.path.exists(spec_path):
        raise FileNotFoundError(spec_path)

    os.makedirs(dist_dir, exist_ok=True)
    os.makedirs(work_dir, exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        spec_path,
        "--noconfirm",
        "--distpath",
        dist_dir,
        "--workpath",
        work_dir,
    ]
    if args.clean:
        cmd.append("--clean")

    proc = subprocess.run(cmd, cwd=repo_root)
    return int(proc.returncode or 0)


if __name__ == "__main__":
    raise SystemExit(main())
